-- 010_caminadora_escaladora.sql
--
-- The dataset matcher (scripts/exercise-dataset/lib.js) mapped the catalog row
-- CAMINADORA (id 142) to dataset 2311 = "walking on stepmill", so the trainee
-- dashboard and the exercise reference dialog showed a stair-climber GIF for
-- the treadmill, and ESCALADORA did not exist as an exercise of its own.
--
-- This migration repairs the labels without touching a single workout,
-- program or training plan reference: the catalog row keeps its id and its
-- Spanish name, only the dataset payload behind it changes.
--
--   1. ESCALADORA is created from dataset 2311 (the payload CAMINADORA is
--      holding today, Spanish instructions included).
--   2. CAMINADORA is re-pointed at dataset 3666 = "walking on incline
--      treadmill", which the 009 import already stored as its own row.
--
-- Additive and idempotent: re-running it is safe.

DO $$
DECLARE
  stepmill  RECORD;
  treadmill RECORD;
BEGIN
  -- ── 1. ESCALADORA (dataset 2311 = walking on stepmill) ────────────────
  IF NOT EXISTS (SELECT 1 FROM exercise_library WHERE name_norm = 'escaladora') THEN
    SELECT * INTO stepmill
      FROM exercise_library
     WHERE dataset_id = '2311'
     ORDER BY (source = 'catalog') DESC, id
     LIMIT 1;

    IF stepmill.id IS NULL THEN
      RAISE NOTICE '010: dataset 2311 (walking on stepmill) not found — ESCALADORA not created';
    ELSE
      INSERT INTO exercise_library (
        muscle_category, name, video_url, name_norm, source, dataset_id,
        body_part, equipment, target_muscle, muscle_group, secondary_muscles,
        gif_file, thumb_file, instructions_es, instructions_en,
        instruction_steps_es, media_attribution, is_active
      ) VALUES (
        COALESCE(stepmill.muscle_category, 'CARDIO'), 'ESCALADORA', stepmill.video_url,
        'escaladora', 'catalog', '2311',
        stepmill.body_part, stepmill.equipment, stepmill.target_muscle,
        stepmill.muscle_group, stepmill.secondary_muscles,
        stepmill.gif_file, stepmill.thumb_file, stepmill.instructions_es,
        stepmill.instructions_en, stepmill.instruction_steps_es,
        stepmill.media_attribution, TRUE
      );
      RAISE NOTICE '010: ESCALADORA created from dataset 2311';
    END IF;
  END IF;

  -- ── 2. CAMINADORA → "walking on incline treadmill" (dataset 3666) ─────
  SELECT * INTO treadmill
    FROM exercise_library
   WHERE dataset_id = '3666' AND source = 'dataset'
   ORDER BY id
   LIMIT 1;

  IF treadmill.id IS NULL THEN
    RAISE NOTICE '010: dataset 3666 (walking on incline treadmill) not imported — CAMINADORA left untouched';
    RETURN;
  END IF;

  UPDATE exercise_library
     SET dataset_id           = '3666',
         body_part            = treadmill.body_part,
         equipment            = treadmill.equipment,
         target_muscle        = treadmill.target_muscle,
         muscle_group         = treadmill.muscle_group,
         secondary_muscles    = treadmill.secondary_muscles,
         gif_file             = treadmill.gif_file,
         thumb_file           = treadmill.thumb_file,
         instructions_es      = treadmill.instructions_es,
         instructions_en      = treadmill.instructions_en,
         instruction_steps_es = treadmill.instruction_steps_es,
         media_attribution    = treadmill.media_attribution
   WHERE name_norm = 'caminadora';

  RAISE NOTICE '010: CAMINADORA re-pointed to dataset 3666 (incline treadmill)';
END $$;

-- Rollback (manual):
--   UPDATE exercise_library
--      SET dataset_id = '2311', gif_file = '2311-j9Q5crt.gif', thumb_file = '2311-j9Q5crt.jpg'
--    WHERE name_norm = 'caminadora';
--   DELETE FROM exercise_library WHERE name_norm = 'escaladora';
