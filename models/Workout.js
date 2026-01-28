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
                        ex.rpe || null,
                        ex.rir || null,
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
     * Get workout plan by ID with exercises
     */
    static async findByIdWithExercises(workoutPlanId) {
        const planResult = await pool.query(
            'SELECT * FROM workout_plans WHERE id = $1',
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
            `SELECT wp.*, u.name as coach_name
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
                    ex.rpe || null,
                    ex.rir || null,
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
    static async updateExercise(exerciseId, data) {
        const { notes } = data;
        const result = await pool.query(
            `UPDATE exercises 
             SET notes = $1
             WHERE id = $2
             RETURNING *`,
            [notes, exerciseId]
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
                logData.rpe || null,
                logData.rir || null,
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
                logData.rpe || null,
                logData.rir || null,
                logData.rir || null,
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
     * Get progression data for a specific exercise and user
     */
    static async getProgression(userId, exerciseName) {
        const result = await pool.query(
            `SELECT 
                el.weight_used, 
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
