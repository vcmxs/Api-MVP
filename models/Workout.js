// models/Workout.js
const pool = require('../config/database');
const { normalizeLocale, DEFAULT_LOCALE } = require('../utils/exercise-language');

/** Same normalisation as exercise_normalize_name() in SQL. */
function normalizeExerciseName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function localeOrDefault(locale) {
    return normalizeLocale(locale) || DEFAULT_LOCALE;
}

/**
 * Resolve the catalog row behind each plan exercise.
 *
 * The client normally sends `exerciseLibraryId` from the picker, but older
 * clients (and workout templates saved before this release) only send a name.
 * In that case the name is matched against the canonical catalog first and the
 * published Spanish translations second; only an unambiguous match is linked.
 *
 * The returned row always keeps `name` canonical when a catalog row was found,
 * so `exercises.name` remains the immutable snapshot and the API can render the
 * localised name through the join instead of storing it.
 */
async function resolveExerciseRows(client, exercises) {
    const rows = Array.isArray(exercises) ? exercises : [];
    if (rows.length === 0) return [];

    const explicitIds = [...new Set(rows
        .map(ex => Number(ex.exerciseLibraryId ?? ex.exercise_library_id))
        .filter(id => Number.isInteger(id) && id > 0))];

    const normalizedNames = [...new Set(rows
        .map(ex => normalizeExerciseName(ex.name))
        .filter(Boolean))];

    const byId = new Map();
    const canonicalByNorm = new Map();
    const translationByNorm = new Map();

    if (explicitIds.length > 0) {
        const result = await client.query(
            'SELECT id, name FROM exercise_library WHERE id = ANY($1::int[])',
            [explicitIds]
        );
        for (const row of result.rows) {
            byId.set(Number(row.id), row);
        }
    }

    if (normalizedNames.length > 0) {
        const result = await client.query(
            `SELECT id, name, name_norm
               FROM exercise_library
              WHERE name_norm = ANY($1::text[])`,
            [normalizedNames]
        );
        for (const row of result.rows) {
            if (!row.name_norm) continue;
            if (!canonicalByNorm.has(row.name_norm)) canonicalByNorm.set(row.name_norm, new Set());
            canonicalByNorm.get(row.name_norm).add(Number(row.id));
            byId.set(Number(row.id), row);
        }

        const translations = await client.query(
            `SELECT t.exercise_id, t.name AS translated_name, t.name_norm, el.name AS canonical_name
               FROM exercise_translations t
               JOIN exercise_library el ON el.id = t.exercise_id
              WHERE t.locale = 'es'
                AND t.status = 'published'
                AND t.name_norm = ANY($1::text[])`,
            [normalizedNames]
        );
        for (const row of translations.rows) {
            if (!row.name_norm) continue;
            if (!translationByNorm.has(row.name_norm)) translationByNorm.set(row.name_norm, new Set());
            translationByNorm.get(row.name_norm).add(Number(row.exercise_id));
            byId.set(Number(row.exercise_id), { id: row.exercise_id, name: row.canonical_name });
        }
    }

    return rows.map(ex => {
        const explicitId = Number(ex.exerciseLibraryId ?? ex.exercise_library_id);
        if (Number.isInteger(explicitId) && explicitId > 0) {
            const match = byId.get(explicitId);
            return match
                ? { ...ex, name: match.name, exerciseLibraryId: explicitId }
                : { ...ex, exerciseLibraryId: null };
        }

        const normalized = normalizeExerciseName(ex.name);
        if (!normalized) return { ...ex, exerciseLibraryId: null };

        const canonical = canonicalByNorm.get(normalized);
        const translated = translationByNorm.get(normalized);
        const matchId = canonical?.size === 1
            ? [...canonical][0]
            : translated?.size === 1
                ? [...translated][0]
                : null;

        if (!matchId) return { ...ex, exerciseLibraryId: null };
        const match = byId.get(matchId);
        return match
            ? { ...ex, name: match.name, exerciseLibraryId: matchId }
            : { ...ex, exerciseLibraryId: null };
    });
}

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
            const resolvedExercises = await resolveExerciseRows(client, exercises);

            // Insert exercises
            const exercisePromises = resolvedExercises.map((ex, index) => {
                return client.query(
                    `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration, track_rpe, track_rir, exercise_library_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
                        ex.trackRir || ex.track_rir || false,
                        ex.exerciseLibraryId ?? null
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
            const resolvedExercises = await resolveExerciseRows(client, exercises);

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
                const exercisePromises = resolvedExercises.map((ex, index) => {
                    return client.query(
                        `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration, track_rpe, track_rir, exercise_library_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
                            ex.trackRir || ex.track_rir || false,
                            ex.exerciseLibraryId ?? null
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
    static async findByIdWithExercises(workoutPlanId, locale = DEFAULT_LOCALE) {
        const planResult = await pool.query(
            'SELECT *, (shared_session_id IS NOT NULL) as is_shared FROM workout_plans WHERE id = $1',
            [workoutPlanId]
        );

        if (planResult.rows.length === 0) {
            return null;
        }

        const exercisesResult = await pool.query(
            `SELECT e.*,
                    COALESCE(t.name, e.name) AS display_name,
                    e.name AS name_snapshot,
                    t.instructions AS instructions_localized,
                    t.instruction_steps AS instruction_steps_localized
               FROM exercises e
               LEFT JOIN exercise_translations t
                      ON t.exercise_id = e.exercise_library_id
                     AND t.locale = $2
                     AND t.status = 'published'
              WHERE e.workout_plan_id = $1
              ORDER BY e.exercise_order`,
            [workoutPlanId, localeOrDefault(locale)]
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
     * Save the whole prescription of a plan in one transaction.
     *
     * The exercise list arrives as the complete desired state, but it is applied
     * as a diff instead of a wipe-and-recreate:
     *   - a row carrying the `id` of an exercise of *this* plan is updated in
     *     place, so its `exercise_logs` survive (adding an exercise, renaming
     *     one or changing its sets/reps no longer erases what the trainee
     *     already logged);
     *   - a row without a valid id is inserted (new exercises, or ids coming
     *     from another plan/template, which can never be overwritten);
     *   - only the ids that disappeared from the list are deleted, and those are
     *     the only logs that cascade (`exercise_logs.exercise_id`).
     * Logged sets above the new set count are pruned so the session cannot show
     * more rows than the prescription has.
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

            const existingResult = await client.query(
                'SELECT id, name, exercise_library_id FROM exercises WHERE workout_plan_id = $1',
                [planId]
            );
            const existingById = new Map(existingResult.rows.map((row) => [Number(row.id), row]));
            const existingIds = new Set(existingById.keys());
            // Every id starts as "gone"; the rows that come back in the payload
            // are removed from this set, so only real removals get deleted.
            const toDelete = new Set(existingIds);
            const updatedIds = new Set();
            const savedExercises = [];
            let deletedLogs = 0;

            const resolvedExercises = await resolveExerciseRows(client, exercises);

            const insertExercise = async (ex, order) => {
                const result = await client.query(
                    `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration, track_rpe, track_rir, exercise_library_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
                        order,
                        ex.rpe !== undefined && ex.rpe !== null ? ex.rpe : null,
                        ex.rir !== undefined && ex.rir !== null ? ex.rir : null,
                        (ex.isCardio || ex.is_cardio) ? true : false,
                        ex.targetDistance || ex.target_distance || null,
                        ex.targetDuration || ex.target_duration || null,
                        ex.trackRpe || ex.track_rpe || false,
                        ex.trackRir || ex.track_rir || false,
                        ex.exerciseLibraryId ?? null
                    ]
                );
                return result.rows[0];
            };

            for (let index = 0; index < resolvedExercises.length; index++) {
                const ex = resolvedExercises[index];
                const rawId = ex.id ?? ex.exerciseId;
                const keepId = rawId === undefined || rawId === null || rawId === ''
                    ? null
                    : Number(rawId);
                // Only ids that already belong to this plan can be updated in
                // place; anything else (a template row, a stale id) is inserted.
                const canUpdate = keepId !== null && Number.isInteger(keepId) &&
                    existingIds.has(keepId) && !updatedIds.has(keepId);

                // Keep the existing catalog link while the snapshot name is
                // unchanged; clear it when a manual rename no longer matches the
                // old catalog row (the trigger may link the new name instead).
                const existing = keepId !== null ? existingById.get(keepId) : null;
                let libraryId = ex.exerciseLibraryId ?? null;
                if (libraryId == null && existing && existing.name === ex.name) {
                    libraryId = existing.exercise_library_id ?? null;
                }

                let updated = null;
                if (canUpdate) {
                    const result = await client.query(
                        `UPDATE exercises
            SET name = $1,
                sets = $2,
                reps = $3,
                target_weight = $4,
                weight_unit = $5,
                rest_time = $6,
                notes = $7,
                exercise_order = $8,
                is_cardio = $9,
                rpe = COALESCE($10, rpe),
                rir = COALESCE($11, rir),
                target_distance = COALESCE($12, target_distance),
                target_duration = COALESCE($13, target_duration),
                track_rpe = COALESCE($14, track_rpe),
                track_rir = COALESCE($15, track_rir),
                exercise_library_id = $16
            WHERE id = $17 AND workout_plan_id = $18
            RETURNING *`,
                        [
                            ex.name,
                            ex.sets,
                            ex.reps,
                            ex.targetWeight || 0,
                            ex.weightUnit || 'kg',
                            ex.restTime ?? 60,
                            ex.notes || '',
                            index + 1,
                            (ex.isCardio || ex.is_cardio) ? true : false,
                            ex.rpe ?? null,
                            ex.rir ?? null,
                            ex.targetDistance ?? ex.target_distance ?? null,
                            ex.targetDuration ?? ex.target_duration ?? null,
                            ex.trackRpe ?? ex.track_rpe ?? null,
                            ex.trackRir ?? ex.track_rir ?? null,
                            libraryId,
                            keepId,
                            planId
                        ]
                    );

                    // The row survived, so did its logs — except the sets the new
                    // prescription no longer has.
                    if (result.rows.length > 0) {
                        updated = result.rows[0];
                        updatedIds.add(keepId);
                        toDelete.delete(keepId);

                        const nextSets = Number(ex.sets);
                        if (Number.isFinite(nextSets)) {
                            const pruned = await client.query(
                                'DELETE FROM exercise_logs WHERE exercise_id = $1 AND set_number > $2 RETURNING id',
                                [keepId, nextSets]
                            );
                            deletedLogs += pruned.rowCount ?? 0;
                        }
                    }
                }

                savedExercises.push(updated ?? await insertExercise(ex, index + 1));
            }

            if (toDelete.size > 0) {
                const removeIds = Array.from(toDelete);
                const removedLogs = await client.query(
                    'SELECT COUNT(*)::int AS count FROM exercise_logs WHERE exercise_id = ANY($1::int[])',
                    [removeIds]
                );
                deletedLogs += removedLogs.rows[0]?.count ?? 0;

                await client.query(
                    'DELETE FROM exercises WHERE workout_plan_id = $1 AND id = ANY($2::int[])',
                    [planId, removeIds]
                );
            }

            await client.query('COMMIT');

            return { ...planResult.rows[0], exercises: savedExercises, deletedLogs };
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
        const resolvedExercises = await resolveExerciseRows(pool, exercises);

        // Insert new exercises
        const exercisePromises = resolvedExercises.map((ex) => {
            currentOrder++;
            return pool.query(
                `INSERT INTO exercises (workout_plan_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order, rpe, rir, is_cardio, target_distance, target_duration, exercise_library_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
                    ex.targetDuration || ex.target_duration || null,
                    ex.exerciseLibraryId ?? null
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
    static async getExercises(workoutPlanId, locale = DEFAULT_LOCALE) {
        const result = await pool.query(
            `SELECT e.*,
                    COALESCE(t.name, e.name) AS display_name,
                    e.name AS name_snapshot,
                    t.instructions AS instructions_localized,
                    t.instruction_steps AS instruction_steps_localized
               FROM exercises e
               LEFT JOIN exercise_translations t
                      ON t.exercise_id = e.exercise_library_id
                     AND t.locale = $2
                     AND t.status = 'published'
              WHERE e.workout_plan_id = $1
              ORDER BY e.exercise_order`,
            [workoutPlanId, localeOrDefault(locale)]
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
    static async getProgression(userId, exerciseName, locale = DEFAULT_LOCALE) {
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
             LEFT JOIN exercise_translations t
                    ON t.exercise_id = e.exercise_library_id
                   AND t.locale = $3
                   AND t.status = 'published'
             WHERE wp.trainee_id = $1 
               AND (e.name ILIKE $2 OR t.name ILIKE $2)
             ORDER BY el.completed_at ASC`,
            [userId, exerciseName, localeOrDefault(locale)]
        );

        return result.rows;
    }

    /**
     * Get list of unique exercises performed by a user
     */
    static async getUniqueExercises(userId, locale = DEFAULT_LOCALE) {
        const result = await pool.query(
            `SELECT DISTINCT COALESCE(t.name, e.name) AS name
             FROM exercises e
             JOIN workout_plans wp ON e.workout_plan_id = wp.id
             LEFT JOIN exercise_translations t
                    ON t.exercise_id = e.exercise_library_id
                   AND t.locale = $2
                   AND t.status = 'published'
             WHERE wp.trainee_id = $1
             ORDER BY name ASC`,
            [userId, localeOrDefault(locale)]
        );
        return result.rows.map(r => r.name);
    }
}

module.exports = Workout;
