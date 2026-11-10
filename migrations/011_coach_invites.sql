-- 011_coach_invites.sql
--
-- Shareable coach -> trainee invite links.
--
-- Until now the ONLY way a trainee could be linked to a coach was the coach
-- typing the trainee's email in the dashboard AFTER the trainee had already
-- created an account. This table backs a real shareable link:
--
--     https://<web app>/join/<code>
--
--   1. The coach opens "My Trainees", the API lazily creates one active invite
--      for that coach (see services/coachInviteService.js).
--   2. The coach shares the link (WhatsApp / any chat).
--   3. The trainee opens it and signs up (or logs in) — the invite code is sent
--      with the registration and the account is linked automatically, using the
--      exact same rules as POST /coaches/:coachId/trainees (tier limit,
--      peer-coaching slot, one active coach per trainee).
--
-- This is NOT users.referral_code. That one belongs to the Win-Win program
-- (coach -> coach commissions) and must never be mixed with account linking.
--
-- Additive and idempotent: re-running it is safe.

CREATE TABLE IF NOT EXISTS coach_invites (
  id SERIAL PRIMARY KEY,
  code VARCHAR(12) UNIQUE NOT NULL,
  coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_invites_code ON coach_invites(code);
CREATE INDEX IF NOT EXISTS idx_coach_invites_coach ON coach_invites(coach_id);

-- Rollback (manual):
--   DROP TABLE IF EXISTS coach_invites;
