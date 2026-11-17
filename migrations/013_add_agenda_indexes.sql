-- 013_add_agenda_indexes.sql
--
-- The dashboard starts with a "Today's workouts" agenda: every plan scheduled
-- for one day, scoped to the coach's trainees (or to a single trainee).
--
-- That query filters on `scheduled_date` and joins `coach_trainee` through
-- `trainee_id`, so it needs the two composite lookups below. Both are additive
-- and idempotent: re-running this migration is safe.

-- Coach agenda / trainee agenda: "plans of trainee X on day Y".
CREATE INDEX IF NOT EXISTS idx_workout_plans_trainee_scheduled
    ON workout_plans (trainee_id, scheduled_date);

-- Admin agenda / calendar-style listings: "everything scheduled for day Y".
CREATE INDEX IF NOT EXISTS idx_workout_plans_scheduled_date
    ON workout_plans (scheduled_date);

-- Keep the planner statistics fresh for the new access paths.
ANALYZE workout_plans;

-- Verify
SELECT indexname
  FROM pg_indexes
 WHERE tablename = 'workout_plans'
   AND indexname IN (
       'idx_workout_plans_trainee_scheduled',
       'idx_workout_plans_scheduled_date'
   )
 ORDER BY indexname;
