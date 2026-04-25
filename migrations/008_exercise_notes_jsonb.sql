-- Migration 008: Change exercises.notes from plain TEXT to JSONB array
-- Each entry: { userId, userName, text, createdAt }
-- We preserve old plain-text notes by migrating them to an "unknown" author entry.

ALTER TABLE exercises
    ALTER COLUMN notes TYPE JSONB
    USING CASE
        WHEN notes IS NULL OR notes = '' THEN '[]'::jsonb
        ELSE jsonb_build_array(
            jsonb_build_object(
                'userId',    NULL,
                'userName',  'Unknown',
                'text',      notes,
                'createdAt', NOW()
            )
        )
    END;

ALTER TABLE exercises
    ALTER COLUMN notes SET DEFAULT '[]'::jsonb;
