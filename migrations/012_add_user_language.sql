-- 012_add_user_language.sql
--
-- Per-user language used when the server renders push notifications.
-- The web/app UI keeps its own preference (localStorage `dupla_lang`); this
-- column lets the API write push copy in the language the user actually reads.
--
-- Additive + idempotent.

ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'es';

-- Keep existing rows on the default instead of NULL
UPDATE users SET language = 'es' WHERE language IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'users_language_check'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_language_check CHECK (language IN ('es', 'en'));
    END IF;
END $$;

-- Verify
SELECT COUNT(*) AS users,
       COUNT(*) FILTER (WHERE language = 'es') AS spanish,
       COUNT(*) FILTER (WHERE language = 'en') AS english
  FROM users;
