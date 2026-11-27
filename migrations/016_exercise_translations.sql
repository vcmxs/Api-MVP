-- 016_exercise_translations.sql
--
-- Localised exercise names/instructions without touching the immutable catalog
-- ids, `exercise_library.name` or the `exercises.name` snapshots that workout
-- plans already contain.
--
-- Model:
--   exercise_library          one row per catalog exercise (id + canonical name)
--   exercise_translations     one row per (exercise_id, locale)
--   exercises.exercise_library_id
--                             optional link from a plan row to the catalog row.
--                             ON DELETE SET NULL so removing a catalog row can
--                             never delete a coach's plan or its logs.
--
-- Old workouts keep working: `exercise_library_id` is nullable and every read
-- path COALESCEs the translation with the snapshot. A trigger fills the link on
-- new plan rows when the name resolves to exactly one catalog exercise, which
-- keeps older clients (and any other INSERT path) working without a deploy.
--
-- Additive + idempotent.

-- Normalisation shared by the catalog, the translations and the linker.
-- Keep in sync with normalizeExerciseName() in server.js /
-- frontend/lib/exercise-media.ts and with migrations/009_exercise_dataset.sql.
CREATE OR REPLACE FUNCTION exercise_normalize_name(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT btrim(regexp_replace(
           translate(
             lower(COALESCE(value, '')),
             'áàäâãéèëêíìïîóòöôõúùüûñçýÿ',
             'aaaaaeeeeiiiiooooouuuuncyy'
           ),
           '[^a-z0-9]+', ' ', 'g'
         ));
$$;

COMMENT ON FUNCTION exercise_normalize_name(TEXT)
  IS 'lowercase, accent-stripped, single-spaced exercise name (search + matching).';

-- The linker depends on exercise_library.name_norm. Migration 009 backfilled it
-- once, but a fresh database seeded from db.js may still have NULLs.
UPDATE exercise_library
   SET name_norm = exercise_normalize_name(name)
 WHERE name_norm IS DISTINCT FROM exercise_normalize_name(name);

CREATE INDEX IF NOT EXISTS exercise_library_name_norm_idx
  ON exercise_library (name_norm);

-- ── Translations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercise_translations (
  id                SERIAL PRIMARY KEY,
  exercise_id       INTEGER NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  locale            VARCHAR(5) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  name_norm         TEXT,
  instructions      TEXT,
  instruction_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status            VARCHAR(16) NOT NULL DEFAULT 'draft',
  source            VARCHAR(32) DEFAULT 'manual',
  confidence        VARCHAR(16),
  notes             TEXT,
  created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (exercise_id, locale),
  CONSTRAINT exercise_translations_locale_check
    CHECK (locale IN ('es', 'en')),
  CONSTRAINT exercise_translations_status_check
    CHECK (status IN ('draft', 'reviewed', 'published')),
  CONSTRAINT exercise_translations_confidence_check
    CHECK (confidence IS NULL OR confidence IN ('alta', 'media', 'baja'))
);

COMMENT ON TABLE exercise_translations
  IS 'Localised catalog name/instructions. exercise_library.name stays canonical.';
COMMENT ON COLUMN exercise_translations.name_norm
  IS 'Derived by the trigger from name; used to search in the active language.';
COMMENT ON COLUMN exercise_translations.status
  IS 'Only published rows are served by /api/v1/exercises.';

-- Derive name_norm + updated_at on every write so the importer and the API can
-- never store a name that does not match its normalised form.
CREATE OR REPLACE FUNCTION exercise_translations_set_derived()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.name_norm := exercise_normalize_name(NEW.name);
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exercise_translations_derive ON exercise_translations;
CREATE TRIGGER exercise_translations_derive
  BEFORE INSERT OR UPDATE OF name
  ON exercise_translations
  FOR EACH ROW
  EXECUTE FUNCTION exercise_translations_set_derived();

-- A translation edit changes what users read, so keep an append-only trail.
-- Imports write 1 row per translation, which is cheap and useful for rollback.
CREATE TABLE IF NOT EXISTS exercise_translation_history (
  id             BIGSERIAL PRIMARY KEY,
  translation_id INTEGER REFERENCES exercise_translations(id) ON DELETE SET NULL,
  exercise_id    INTEGER,
  locale         VARCHAR(5),
  action         VARCHAR(8) NOT NULL,
  name           VARCHAR(255),
  instructions   TEXT,
  status         VARCHAR(16),
  source         VARCHAR(32),
  confidence     VARCHAR(16),
  notes          TEXT,
  changed_by     INTEGER,
  changed_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION exercise_translations_record_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- The row is already gone, so the FK must stay NULL (otherwise the audit
    -- INSERT would reference a deleted translation).
    INSERT INTO exercise_translation_history
      (translation_id, exercise_id, locale, action, name, instructions,
       status, source, confidence, notes)
    VALUES
      (NULL, OLD.exercise_id, OLD.locale, 'delete', OLD.name, OLD.instructions,
       OLD.status, OLD.source, OLD.confidence, OLD.notes);
    RETURN OLD;
  END IF;

  INSERT INTO exercise_translation_history
    (translation_id, exercise_id, locale, action, name, instructions,
     status, source, confidence, notes)
  VALUES
    (NEW.id, NEW.exercise_id, NEW.locale, lower(TG_OP), NEW.name, NEW.instructions,
     NEW.status, NEW.source, NEW.confidence, NEW.notes);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exercise_translations_history ON exercise_translations;
CREATE TRIGGER exercise_translations_history
  AFTER INSERT OR UPDATE OR DELETE
  ON exercise_translations
  FOR EACH ROW
  EXECUTE FUNCTION exercise_translations_record_history();

-- ── Plan-row link ───────────────────────────────────────────────────────────
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS exercise_library_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'exercises_exercise_library_id_fkey'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_exercise_library_id_fkey
      FOREIGN KEY (exercise_library_id)
      REFERENCES exercise_library(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS exercises_exercise_library_id_idx
  ON exercises (exercise_library_id);

COMMENT ON COLUMN exercises.exercise_library_id
  IS 'Catalog link used to read the localised name. NULL = legacy/custom row.';

-- Only fill the link when it is empty. A name that matches more than one
-- catalog row (or none) stays NULL, so the snapshot is always shown instead of
-- guessing. The second pass against published Spanish translations helps rows
-- created by a Spanish-speaking client before this migration.
CREATE OR REPLACE FUNCTION exercises_link_exercise_library()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  normalized   TEXT;
  matched_id   INTEGER;
  match_count  BIGINT;
BEGIN
  IF NEW.exercise_library_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  normalized := exercise_normalize_name(NEW.name);
  IF normalized = '' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), MIN(id) INTO match_count, matched_id
    FROM exercise_library
   WHERE name_norm = normalized;

  IF match_count <> 1 THEN
    SELECT COUNT(*), MIN(exercise_id) INTO match_count, matched_id
      FROM exercise_translations
     WHERE locale = 'es'
       AND status = 'published'
       AND name_norm = normalized;
  END IF;

  IF match_count = 1 THEN
    NEW.exercise_library_id := matched_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exercises_link_exercise_library ON exercises;
CREATE TRIGGER exercises_link_exercise_library
  BEFORE INSERT OR UPDATE OF name, exercise_library_id
  ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION exercises_link_exercise_library();

-- ── Orphans from the dataset (no catalog id yet) ────────────────────────────
-- The importer never invents an `exercise_library.id`; orphaned dataset rows
-- wait here until an admin decides whether to insert a real catalog row.
CREATE TABLE IF NOT EXISTS exercise_translation_candidates (
  id         SERIAL PRIMARY KEY,
  dataset_id VARCHAR(8),
  locale     VARCHAR(5) NOT NULL DEFAULT 'es',
  name       VARCHAR(255) NOT NULL,
  name_norm  TEXT,
  notes      TEXT,
  status     VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (locale IN ('es', 'en')),
  CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS exercise_translation_candidates_dataset_locale_key
  ON exercise_translation_candidates (dataset_id, locale)
  WHERE dataset_id IS NOT NULL;

CREATE OR REPLACE FUNCTION exercise_translation_candidates_set_derived()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.name_norm := exercise_normalize_name(NEW.name);
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exercise_translation_candidates_derive ON exercise_translation_candidates;
CREATE TRIGGER exercise_translation_candidates_derive
  BEFORE INSERT OR UPDATE OF name
  ON exercise_translation_candidates
  FOR EACH ROW
  EXECUTE FUNCTION exercise_translation_candidates_set_derived();

-- ── Indexes used by the read paths ──────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS exercise_translations_exercise_locale_key
  ON exercise_translations (exercise_id, locale);

CREATE INDEX IF NOT EXISTS exercise_translations_locale_status_name_idx
  ON exercise_translations (locale, status, name_norm);

CREATE INDEX IF NOT EXISTS exercise_translations_name_norm_idx
  ON exercise_translations (name_norm);

CREATE INDEX IF NOT EXISTS exercise_translation_history_exercise_idx
  ON exercise_translation_history (exercise_id, changed_at DESC);
