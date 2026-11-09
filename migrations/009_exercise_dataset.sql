-- 009_exercise_dataset.sql
--
-- Enriches exercise_library with the hasaneyldrm/exercises-dataset payload:
-- muscle taxonomy (target / synergists / body part / equipment), the Spanish
-- instructions used by the exercise reference dialog, and the self-hosted media
-- file names (GIF + 180x180 thumbnail).
--
-- Everything is additive and idempotent: no existing column is renamed, altered
-- or dropped, so the old catalog rows keep their id and Spanish name and every
-- workout/program reference keeps working.

ALTER TABLE exercise_library
  -- normalized name (lowercase, no accents, single spaces) used for search,
  -- exact lookups and duplicate protection
  ADD COLUMN IF NOT EXISTS name_norm            TEXT,
  -- 'catalog' = the rows that already existed, 'dataset' = imported records
  ADD COLUMN IF NOT EXISTS source               VARCHAR(16) DEFAULT 'catalog',
  -- dataset primary key ("0001".."1324"), used for traceability / rollback
  ADD COLUMN IF NOT EXISTS dataset_id           VARCHAR(8),
  -- muscle taxonomy
  ADD COLUMN IF NOT EXISTS body_part            VARCHAR(40),
  ADD COLUMN IF NOT EXISTS equipment            VARCHAR(80),
  ADD COLUMN IF NOT EXISTS target_muscle        VARCHAR(80),
  ADD COLUMN IF NOT EXISTS muscle_group         VARCHAR(80),
  ADD COLUMN IF NOT EXISTS secondary_muscles    JSONB DEFAULT '[]'::jsonb,
  -- media files (bare file names; the CDN base lives in EXERCISE_MEDIA_BASE)
  ADD COLUMN IF NOT EXISTS gif_file             TEXT,
  ADD COLUMN IF NOT EXISTS thumb_file           TEXT,
  -- instructions
  ADD COLUMN IF NOT EXISTS instructions_es      TEXT,
  ADD COLUMN IF NOT EXISTS instructions_en      TEXT,
  ADD COLUMN IF NOT EXISTS instruction_steps_es JSONB DEFAULT '[]'::jsonb,
  -- '© Gym visual — gymvisual.com'
  ADD COLUMN IF NOT EXISTS media_attribution    VARCHAR(160),
  ADD COLUMN IF NOT EXISTS is_active            BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN exercise_library.name_norm IS 'lowercase, accent-stripped, single-spaced name. Unique.';
COMMENT ON COLUMN exercise_library.source IS 'catalog = original rows, dataset = imported from exercises-dataset.';
COMMENT ON COLUMN exercise_library.gif_file IS 'File name inside {EXERCISE_MEDIA_BASE}/gif/.';
COMMENT ON COLUMN exercise_library.thumb_file IS 'File name inside {EXERCISE_MEDIA_BASE}/thumb/.';

-- Backfill the normalized name so search/lookup work even before the import
-- runs: lowercase, accents stripped, every non-alphanumeric run collapsed to a
-- single space. Identical to normalizeExerciseName() in server.js /
-- frontend/lib/exercise-media.ts. The import rewrites the same value, so this
-- stays a no-op afterwards.
UPDATE exercise_library
   SET name_norm = btrim(regexp_replace(
         translate(
           lower(name),
           'áàäâãéèëêíìïîóòöôõúùüûñçýÿ',
           'aaaaaeeeeiiiiooooouuuuncyy'
         ),
         '[^a-z0-9]+', ' ', 'g'
       ))
 WHERE name_norm IS DISTINCT FROM btrim(regexp_replace(
         translate(
           lower(name),
           'áàäâãéèëêíìïîóòöôõúùüûñçýÿ',
           'aaaaaeeeeiiiiooooouuuuncyy'
         ),
         '[^a-z0-9]+', ' ', 'g'
       ));

-- Unique index on name_norm: the duplicate guard for future imports. If the
-- catalog already contains two names that only differ in case/accents the
-- unique index cannot be built, so we fall back to a plain index (the import
-- reports the collision instead of failing the migration).
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS exercise_library_name_norm_key
      ON exercise_library (name_norm);
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'exercise_library: duplicate name_norm values found, created a non-unique index instead';
    CREATE INDEX IF NOT EXISTS exercise_library_name_norm_idx
      ON exercise_library (name_norm);
  END;
END $$;

CREATE INDEX IF NOT EXISTS exercise_library_source_idx
  ON exercise_library (source);

CREATE INDEX IF NOT EXISTS exercise_library_dataset_id_idx
  ON exercise_library (dataset_id);
