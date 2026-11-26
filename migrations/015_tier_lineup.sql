-- 015_tier_lineup.sql
-- Plan line-up: Starter (1 trainee, free) · Bronze (5, $5) · Silver (15, $15) ·
-- Gold (unlimited, $30). Every plan ships the full product; only the trainee
-- capacity changes.
--
-- Retired tier names cannot survive the deploy: config/subscriptionTiers.js no
-- longer knows `olympian`, and an unknown tier resolves to a trainee limit of 0,
-- which would lock a coach out. This migration rewrites only the rows that hold
-- a name the new line-up does not have, and it does so without taking capacity
-- away from anyone:
--
--   olympian                               → gold    (was unlimited, stays unlimited)
--   basic / enterprise / NULL / anything else → bronze (5 trainees, $5)
--
-- Bronze, Silver and Gold rows are left untouched: the code already carries
-- their new limits and prices and the coach keeps the same capacity. Nothing
-- else about a subscription is modified — status, start and end dates,
-- `is_comped` and the `payments` ledger keep their values.
--
-- Safe to re-run: after the first pass every coach holds a current tier, so the
-- WHERE clause matches no rows.

UPDATE users
   SET subscription_tier = CASE lower(subscription_tier)
                               WHEN 'olympian' THEN 'gold'
                               ELSE 'bronze'
                           END,
       updated_at = NOW()
 WHERE role = 'coach'
   AND (subscription_tier IS NULL
        OR lower(subscription_tier) NOT IN ('starter', 'bronze', 'silver', 'gold'));

SELECT 'Migration 015 completed successfully!' AS message;
