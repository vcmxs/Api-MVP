-- 014_release_notes.sql
--
-- Release notes ("What's new") shown in Settings for coaches and trainees.
-- A row is authored from the admin panel; publishing it also fan-outs one
-- `release_note` notification per coach/trainee (see
-- controllers/release_notes.controller.js) so the update reaches the bell.
--
-- Additive and idempotent: re-running is safe.

CREATE TABLE IF NOT EXISTS release_notes (
    id           SERIAL PRIMARY KEY,
    version      VARCHAR(20)  NOT NULL,
    title_es     TEXT         NOT NULL,
    title_en     TEXT         NOT NULL,
    body_es      TEXT         NOT NULL,
    body_en      TEXT         NOT NULL,
    is_published BOOLEAN      NOT NULL DEFAULT TRUE,
    notified_at  TIMESTAMP,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The settings section reads the published rows newest-first.
CREATE INDEX IF NOT EXISTS idx_release_notes_published
    ON release_notes (is_published, created_at DESC);
