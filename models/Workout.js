// models/Workout.js
const pool = require('../config/database');

class Workout {
    /**
     * Create a new workout plan with exercises (transaction)
     */
    static async createWithExercises(workoutData, exercises) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Insert workout plan
            const planResult = await client.query(
                `INSERT INTO workout_plans (trainee_id, coach_id, name, description, scheduled_date, status)
         VALUES ($1, $2, $3, $4, $5, 'assigned')
         RETURNING *`,
                [
                    workoutData.traineeId,
                    workoutData.coachId,
                    workoutData.name,
                    workoutData.description || '',
                    workoutData.scheduledDate || new Date().toISOString().split('T')[0]
                ]
            );

            const workoutPlan = planResult.rows[0];

            // Insert exercises
            const exercisePromises = exercises.map((ex, index) => {
                return client.query(
                    `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration, track_rpe, track_rir)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           RETURNING *`,
                    [
                        workoutPlan.id,
                        ex.name,
                        ex.sets,
                        ex.reps,
                        ex.targetWeight || 0,
                        ex.weightUnit || 'kg',
                        ex.restTime || 60,
                        ex.notes || '',
                        index + 1,
                        ex.rpe !== undefined && ex.rpe !== null ? ex.rpe : null,
                        ex.rir !== undefined && ex.rir !== null ? ex.rir : null,
                        (ex.isCardio || ex.is_cardio) ? true : false,
                        ex.targetDistance || ex.target_distance || null,
                        ex.targetDuration || ex.target_duration || null,
                        ex.trackRpe || ex.track_rpe || false,
                        ex.trackRir || ex.track_rir || false
                    ]
                );
            });

            const exerciseResults = await Promise.all(exercisePromises);
            const insertedExercises = exerciseResults.map(r => r.rows[0]);

            await client.query('COMMIT');

            return { workoutPlan, exercises: insertedExercises };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Create a shared Co-Op workout plan assigned to two users
     */
    static async createSharedWithExercises(workoutData, exercises) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Create the overarching shared session
            const sessionResult = await client.query(
                `INSERT INTO shared_sessions (creator_id) VALUES ($1) RETURNING *`,
                [workoutData.coachId]
            );
            const sharedSessionId = sessionResult.rows[0].id;

            // 2. Create two identical workout plans, one for each user. Both point to the same coach_id and shared_session_id.
            const userIds = [workoutData.coachId, workoutData.traineeId]; // Usually Coach and Peer Coach/Trainee
            const workoutPlans = [];
            const allInsertedExercises = [];

            for (const userId of userIds) {
                const planResult = await client.query(
                    `INSERT INTO workout_plans (trainee_id, coach_id, shared_session_id, name, description, scheduled_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'assigned')
             RETURNING *`,
                    [
                        userId, // Each person becomes a trainee of their own plan
                        workoutData.coachId, // Original creator is technically the logic 'coach'
                        sharedSessionId,
                        workoutData.name,
                        workoutData.description || '',
                        workoutData.scheduledDate || new Date().toISOString().split('T')[0]
                    ]
                );
                const workoutPlan = planResult.rows[0];
                workoutPlans.push(workoutPlan);

                // Insert exercises for this specific plan instance
                const exercisePromises = exercises.map((ex, index) => {
                    return client.query(
                        `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration, track_rpe, track_rir)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               RETURNING *`,
                        [
                            workoutPlan.id,
                            ex.name,
                            ex.sets,
                            ex.reps,
                            ex.targetWeight || 0,
                            ex.weightUnit || 'kg',
                            ex.restTime || 60,
                            ex.notes || '',
                            index + 1,
                            ex.rpe !== undefined && ex.rpe !== null ? ex.rpe : null,
                            ex.rir !== undefined && ex.rir !== null ? ex.rir : null,
                            (ex.isCardio || ex.is_cardio) ? true : false,
                            ex.targetDistance || ex.target_distance || null,
                            ex.targetDuration || ex.target_duration || null,
                            ex.trackRpe || ex.track_rpe || false,
                            ex.trackRir || ex.track_rir || false
                        ]
                    );
                });

                const exerciseResults = await Promise.all(exercisePromises);
                allInsertedExercises.push({
                    userId,
                    planId: workoutPlan.id,
                    exercises: exerciseResults.map(r => r.rows[0])
                });
            }

            await client.query('COMMIT');

            return { sharedSessionId, plans: workoutPlans, allExercises: allInsertedExercises };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get workout plan by ID with exercises
     */
    static async findByIdWithExercises(workoutPlanId) {
        const planResult = await pool.query(
            'SELECT *, (shared_session_id IS NOT NULL) as is_shared FROM workout_plans WHERE id = $1',
            [workoutPlanId]
        );

        if (planResult.rows.length === 0) {
            return null;
        }

        const exercisesResult = await pool.query(
            'SELECT * FROM exercises WHERE workout_plan_id = $1 ORDER BY exercise_order',
            [workoutPlanId]
        );

        return {
            ...planResult.rows[0],
            exercises: exercisesResult.rows
        };
    }

    /**
     * Get all workout plans for a trainee
     */
    static async findByTraineeId(traineeId) {
        const result = await pool.query(
            `SELECT wp.*, 
                (wp.shared_session_id IS NOT NULL) as is_shared,
                u.name as coach_name,
                (
                    SELECT pu.name 
                    FROM workout_plans pwp
                    JOIN users pu ON pwp.trainee_id = pu.id
                    WHERE pwp.shared_session_id = wp.shared_session_id
                    AND pwp.trainee_id != wp.trainee_id
                    LIMIT 1
                ) as partner_name
             FROM workout_plans wp
             LEFT JOIN users u ON wp.coach_id = u.id
             WHERE wp.trainee_id = $1
             ORDER BY wp.created_at DESC`,
            [traineeId]
        );

        return result.rows;
    }

    /**
     * Update workout plan
     */
    static async update(planId, updateData) {
        const { name, description, scheduledDate } = updateData;

        const result = await pool.query(
            `UPDATE workout_plans 
       SET name = $1, description = $2, scheduled_date = $3 
       WHERE id = $4 
       RETURNING *`,
            [name, description, scheduledDate, planId]
        );

        return result.rows[0];
    }

    /**
     * Replace the whole prescription of a plan in one transaction.
     *
     * Coaches edit assigned routines from the trainee detail sheet, so the
     * exercise list arrives as the complete desired state: the old rows are
     * dropped and the new ones inserted (exercise_logs cascade with them).
     * `null`/`undefined` header fields keep their current value.
     */
    static async replaceExercises(planId, updateData, exercises) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const planResult = await client.query(
                `UPDATE workout_plans
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           scheduled_date = COALESCE($3, scheduled_date)
       WHERE id = $4
       RETURNING *`,
                [
                    updateData.name ?? null,
                    updateData.description ?? null,
                    updateData.scheduledDate ?? null,
                    planId
                ]
            );

            if (planResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            await client.query('DELETE FROM exercises WHERE workout_plan_id = $1', [planId]);

            const insertedExercises = [];
            for (let index = 0; index < exercises.length; index++) {
                const ex = exercises[index];
                const result = await client.query(
                    `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration, track_rpe, track_rir)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           RETURNING *`,
                    [
                        planId,
                        ex.name,
                        ex.sets,
                        ex.reps,
                        ex.targetWeight || 0,
                        ex.weightUnit || 'kg',
                        ex.restTime ?? 60,
                        ex.notes || '',
                        index + 1,
                        ex.rpe !== undefined && ex.rpe !== null ? ex.rpe : null,
                        ex.rir !== undefined && ex.rir !== null ? ex.rir : null,
                        (ex.isCardio || ex.is_cardio) ? true : false,
                        ex.targetDistance || ex.target_distance || null,
                        ex.targetDuration || ex.target_duration || null,
                        ex.trackRpe || ex.track_rpe || false,
                        ex.trackRir || ex.track_rir || false
                    ]
                );
                insertedExercises.push(result.rows[0]);
            }

            await client.query('COMMIT');

            return { ...planResult.rows[0], exercises: insertedExercises };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Delete workout plan
     */
    static async delete(planId) {
        const result = await pool.query(
            'DELETE FROM workout_plans WHERE id = $1 RETURNING *',
            [planId]
        );

        return result.rows[0];
    }

    /**
     * Start workout (change status to in_progress)
     */
    static async start(planId) {
        const result = await pool.query(
            `UPDATE workout_plans 
       SET status = 'in_progress', started_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
            [planId]
        );

        return result.rows[0];
    }

    /**
     * Complete workout
     */
    static async complete(planId) {
        const result = await pool.query(
            `UPDATE workout_plans 
       SET status = 'completed', completed_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
            [planId]
        );

        return result.rows[0];
    }

    /**
     * Add exercises to existing workout plan
     */
    static async addExercises(planId, exercises) {
        // Get current max exercise order
        const maxOrderResult = await pool.query(
            'SELECT COALESCE(MAX(exercise_order), 0) as max_order FROM exercises WHERE workout_plan_id = $1',
            [planId]
        );
        let currentOrder = maxOrderResult.rows[0].max_order;

        // Insert new exercises
        const exercisePromises = exercises.map((ex) => {
            currentOrder++;
            return pool.query(
                `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
                [
                    planId,
                    ex.name,
                    ex.sets,
                    ex.reps,
                    ex.targetWeight || 0,
                    ex.weightUnit || 'kg',
                    ex.restTime || 60,
                    ex.notes || '',
                    currentOrder,
                    ex.rpe !== undefined && ex.rpe !== null ? ex.rpe : null,
                    ex.rir !== undefined && ex.rir !== null ? ex.rir : null,
                    (ex.isCardio || ex.is_cardio) ? true : false,
                    ex.targetDistance || ex.target_distance || null,
                    ex.targetDuration || ex.target_duration || null
                ]
            );
        });

        const results = await Promise.all(exercisePromises);
        return results.map(r => r.rows[0]);
    }

    /**
     * Delete exercise from workout plan
     */
    static async deleteExercise(exerciseId) {
        const result = await pool.query(
            'DELETE FROM exercises WHERE id = $1 RETURNING *',
            [exerciseId]
        );

        return result.rows[0];
    }

    /**
     * Update exercise (e.g. notes)
     */
    static async updateExercise(exerciseId, planId, actor, data) {
        const columns = [];
        const values = [];
        const addField = (column, value) => {
            values.push(value);
            columns.push(`${column} = $${values.length}`);
        };

        if (Object.prototype.hasOwnProperty.call(data, 'notes')) addField('notes', data.notes);
        if (Object.prototype.hasOwnProperty.call(data, 'trackRpe')) addField('track_rpe', data.trackRpe);
        if (Object.prototype.hasOwnProperty.call(data, 'trackRir')) addField('track_rir', data.trackRir);
        if (!columns.length) return null;

        const where = [];
        values.push(exerciseId, planId);
        where.push(`e.id = $${values.length - 1}`, `e.workout_plan_id = $${values.length}`);
        if (actor.role === 'coach') {
            values.push(actor.userId);
            where.push(`wp.coach_id = $${values.length}`);
        } else if (actor.role === 'trainee') {
            values.push(actor.userId);
            where.push(`wp.trainee_id = $${values.length}`);
        }

        const result = await pool.query(
            `UPDATE exercises AS e
             SET ${columns.join(', ')}
             FROM workout_plans AS wp
             WHERE ${where.join(' AND ')}
               AND wp.id = e.workout_plan_id
             RETURNING e.*`,
            values
        );
        return result.rows[0];
    }

    /**
     * Log exercise set
     */
    static async logExerciseSet(workoutPlanId, exerciseId, logData) {
        // Note: workoutPlanId is passed but not used in INSERT if column doesn't exist
        // We removed logged_at and workout_plan_id to match likely schema

        const result = await pool.query(
            `INSERT INTO exercise_logs (exercise_id, set_number, reps_completed, weight_used, weight_unit, notes, rpe, rir, distance, duration, calories, completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                exerciseId,
                logData.setNumber,
                logData.repsCompleted,
                logData.weightUsed,
                logData.weightUnit || 'kg',
                logData.notes || '',
                logData.rpe !== undefined && logData.rpe !== null ? logData.rpe : null,
                logData.rir !== undefined && logData.rir !== null ? logData.rir : null,
                logData.distance || null,
                logData.duration || null,
                logData.calories || null,
                logData.completed !== undefined ? logData.completed : true
            ]
        );

        return result.rows[0];
    }

    /**
     * Update exercise log
     */
    static async updateExerciseLog(logId, logData) {
        const result = await pool.query(
            `UPDATE exercise_logs 
             SET set_number = $1, reps_completed = $2, weight_used = $3, weight_unit = $4, notes = $5, rpe = $6, rir = $7, distance = $8, duration = $9, calories = $10, completed = $11
             WHERE id = $12
             RETURNING *`,
            [
                logData.setNumber,
                logData.repsCompleted,
                logData.weightUsed,
                logData.weightUnit || 'kg',
                logData.notes || '',
                logData.rpe !== undefined && logData.rpe !== null ? logData.rpe : null,
                logData.rir !== undefined && logData.rir !== null ? logData.rir : null,
                logData.distance || null,
                logData.duration || null,
                logData.calories || null,
                logData.completed !== undefined ? logData.completed : true,
                logId
            ]
        );
        return result.rows[0];
    }

    /**
     * Get exercise logs
     */
    static async getExerciseLogs(exerciseId) {
        const result = await pool.query(
            'SELECT * FROM exercise_logs WHERE exercise_id = $1 ORDER BY set_number',
            [exerciseId]
        );

        return result.rows;
    }

    /**
     * Delete exercise log
     */
    static async deleteExerciseLog(logId) {
        const result = await pool.query(
            'DELETE FROM exercise_logs WHERE id = $1 RETURNING *',
            [logId]
        );
        return result.rows[0];
    }

    /**
     * Get exercises for a workout plan
     */
    static async getExercises(workoutPlanId) {
        const result = await pool.query(
            'SELECT * FROM exercises WHERE workout_plan_id = $1 ORDER BY exercise_order',
            [workoutPlanId]
        );

        return result.rows;
    }
    /**
     * Every plan scheduled for one day — the data behind the dashboard agenda.
     *
     * `date` is a `YYYY-MM-DD` string in the caller's local day (scheduled_date
     * is DATE and db.js returns it verbatim, so no timezone shifting happens).
     * Scope is optional and additive:
     *   - `traineeId` → that trainee's plans (trainee dashboard)
     *   - `coachId`   → plans of the trainees linked to that coach **plus the
     *                   coach's own routines**. Own routines are keyed by
     *                   `trainee_id = coach_id` and `coach_trainee` never links a
     *                   coach to themself, so they used to be filtered out of the
     *                   coach's own agenda.
     *   - neither     → the whole day (admin)
     *
     * `exercise_count` comes from a correlated subquery so the agenda needs a
     * single round-trip instead of one extra query per row.
     *
     * Ordering: the caller's own routines first (`trainee_id = coachId`), then
     * everyone alphabetically by trainee name. `NULLS LAST` keeps the admin /
     * trainees-only listings plain-alphabetical, because `$3` is NULL there and
     * every row would evaluate the boolean to NULL.
     */
    static async findAgenda({ date, traineeId = null, coachId = null } = {}) {
        const result = await pool.query(
            `SELECT wp.id,
                    wp.trainee_id,
                    wp.coach_id,
                    wp.name,
                    wp.status,
                    wp.scheduled_date,
                    wp.shared_session_id,
                    wp.created_at,
                    u.name  AS trainee_name,
                    u.email AS trainee_email,
                    (SELECT COUNT(*)::int
                       FROM exercises e
                      WHERE e.workout_plan_id = wp.id) AS exercise_count
               FROM workout_plans wp
               JOIN users u ON u.id = wp.trainee_id
              WHERE wp.scheduled_date = $1::date
                AND ($2::int IS NULL OR wp.trainee_id = $2::int)
                AND ($3::int IS NULL
                     OR wp.trainee_id = $3::int
                     OR wp.trainee_id IN (
                        SELECT ct.trainee_id
                          FROM coach_trainee ct
                         WHERE ct.coach_id = $3::int))
              ORDER BY (wp.trainee_id = $3::int) DESC NULLS LAST,
                       u.name ASC,
                       wp.created_at ASC
              LIMIT 200`,
            [date, traineeId, coachId]
        );

        return result.rows;
    }

    /**
     * Get progression data for a specific exercise and user
     */
    static async getProgression(userId, exerciseName) {
        const result = await pool.query(
            `SELECT 
                el.weight_used, 
                el.weight_unit,
                el.reps_completed, 
                el.completed_at,
                el.set_number,
                el.rpe,
                el.rir,
                wp.scheduled_date,
                wp.id as workout_plan_id
             FROM exercise_logs el
             JOIN exercises e ON el.exercise_id = e.id
             JOIN workout_plans wp ON e.workout_plan_id = wp.id
             WHERE wp.trainee_id = $1 
               AND e.name ILIKE $2
             ORDER BY el.completed_at ASC`,
            [userId, exerciseName]
        );

        return result.rows;
    }

    /**
     * Get list of unique exercises performed by a user
     */
    static async getUniqueExercises(userId) {
        const result = await pool.query(
            `SELECT DISTINCT e.name
             FROM exercises e
             JOIN workout_plans wp ON e.workout_plan_id = wp.id
             WHERE wp.trainee_id = $1
             ORDER BY e.name ASC`,
            [userId]
        );
        return result.rows.map(r => r.name);
    }
}

module.exports = Workout;
