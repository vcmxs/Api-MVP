-- 015_tier_lineup.sql
-- Plan line-up: Starter (1 trainee, free) · Bronze (5, $5) · Silver (15, $15) ·
-- Gold (unlimited, $30). Every plan ships the full product; only the trainee
-- capacity changes.
--
-- `olympian` was removed from config/subscriptionTiers.js, so any coach still
-- holding it (or a retired name such as `basic` / `enterprise`) is parked on
-- Bronze until the owner re-assigns each plan by hand from /admin. Starter
-- accounts are left untouched and nothing else about a subscription is modified:
-- status, start and end dates, `is_comped` and the `payments` ledger keep their
-- values.
--
-- Safe to re-run: after the first pass every coach is either 'starter' or
-- 'bronze', so the WHERE clause matches no rows.

UPDATE users
   SET subscription_tier = 'bronze',
       updated_at = NOW()
 WHERE role = 'coach'
   AND (subscription_tier IS NULL OR lower(subscription_tier) <> 'starter');

SELECT 'Migration 015 completed successfully!' AS message;
