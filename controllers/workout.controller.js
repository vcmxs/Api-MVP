// controllers/workout.controller.js
const Workout = require('../models/Workout');
const NotificationController = require('./notification.controller');

/**
 * Create workout plan with exercises
 */
exports.createWorkoutPlan = async (req, res) => {
    try {
        const { traineeId, coachId, name, description, scheduledDate, exercises } = req.body;

        if (!traineeId || !coachId || !name || !exercises || exercises.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Missing required fields: traineeId, coachId, name, and exercises'
            });
        }

        const { workoutPlan, exercises: insertedExercises } = await Workout.createWithExercises(
            { traineeId, coachId, name, description, scheduledDate },
            exercises
        );

        res.status(201).json({
            id: workoutPlan.id.toString(),
            traineeId: workoutPlan.trainee_id.toString(),
            name: workoutPlan.name,
            description: workoutPlan.description,
            scheduledDate: workoutPlan.scheduled_date,
            status: workoutPlan.status,
            createdAt: workoutPlan.created_at,
            completedAt: workoutPlan.completed_at,
            exercises: insertedExercises.map(ex => ({
                id: ex.id.toString(),
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                targetWeight: parseFloat(ex.target_weight),
                weightUnit: ex.weight_unit,
                restTime: ex.rest_time,
                notes: ex.notes,
                order: ex.exercise_order,
                isCardio: ex.is_cardio,
                targetDistance: ex.target_distance,
                targetDuration: ex.target_duration
            }))
        });

        // Notify Trainee (only if not assigning to self)
        if (String(traineeId) !== String(coachId)) {
            const coachResult = await require('../config/database').query('SELECT name FROM users WHERE id = $1', [coachId]);
            const coachName = coachResult.rows[0]?.name || 'Coach';

            await NotificationController.createNotification(
                workoutPlan.trainee_id,
                'New Workout Assigned',
                JSON.stringify({ name: coachName, workoutName: workoutPlan.name }),
                'workout_assigned',
                workoutPlan.id,
                true // sendPush = true for workout assignments
            );
        }
    } catch (err) {
        console.error('Create workout plan error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get workout plan by ID
 */
exports.getWorkoutPlanById = async (req, res) => {
    try {
        const workout = await Workout.findByIdWithExercises(req.params.workoutPlanId);

        if (!workout) {
            return res.status(404).json({ error: 'Not Found', message: 'Workout plan not found' });
        }

        res.json({
            id: workout.id.toString(),
            traineeId: workout.trainee_id.toString(),
            coachId: workout.coach_id.toString(),
            name: workout.name,
            description: workout.description,
            scheduledDate: workout.scheduled_date,
            status: workout.status,
            createdAt: workout.created_at,
            startedAt: workout.started_at,
            completedAt: workout.completed_at,
            exercises: workout.exercises.map(ex => ({
                id: ex.id.toString(),
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                targetWeight: parseFloat(ex.target_weight),
                weightUnit: ex.weight_unit,
                restTime: ex.rest_time,
                notes: ex.notes,
                order: ex.exercise_order,
                rpe: ex.rpe,
                rir: ex.rir,
                trackRpe: ex.track_rpe !== undefined ? ex.track_rpe : (ex.rpe != null),
                trackRir: ex.track_rir !== undefined ? ex.track_rir : (ex.rir != null),
                isCardio: ex.is_cardio,
                targetDistance: ex.target_distance,
                targetDuration: ex.target_duration
            }))
        });
    } catch (err) {
        console.error('Get workout plan error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get all workout plans for a trainee
 */
exports.getTraineeWorkoutPlans = async (req, res) => {
    try {
        const workouts = await Workout.findByTraineeId(req.params.traineeId);

        // Load exercises for each workout plan
        const workoutsWithExercises = await Promise.all(
            workouts.map(async (wp) => {
                const exercises = await Workout.getExercises(wp.id);
                return {
                    id: wp.id.toString(),
                    name: wp.name,
                    description: wp.description,
                    scheduledDate: wp.scheduled_date,
                    status: wp.status,
                    coachName: wp.coach_name,
                    createdAt: wp.created_at,
                    completedAt: wp.completed_at,
                    exercises: exercises.map(ex => ({
                        id: ex.id.toString(),
                        name: ex.name,
                        sets: ex.sets,
                        reps: ex.reps,
                        targetWeight: parseFloat(ex.target_weight),
                        weightUnit: ex.weight_unit,
                        restTime: ex.rest_time,
                        notes: ex.notes,
                        order: ex.exercise_order,
                        rpe: ex.rpe,
                        rir: ex.rir,
                        trackRpe: ex.track_rpe !== undefined ? ex.track_rpe : (ex.rpe != null),
                        trackRir: ex.track_rir !== undefined ? ex.track_rir : (ex.rir != null),
                        isCardio: ex.is_cardio,
                        targetDistance: ex.target_distance,
                        targetDuration: ex.target_duration
                    }))
                };
            })
        );

        res.json({
            workoutPlans: workoutsWithExercises
        });
    } catch (err) {
        console.error('Get trainee workouts error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update workout plan
 */
exports.updateWorkoutPlan = async (req, res) => {
    try {
        const { name, description, scheduledDate } = req.body;
        const { planId, workoutPlanId } = req.params;
        const id = planId || workoutPlanId;

        const workout = await Workout.update(id, { name, description, scheduledDate });

        if (!workout) {
            return res.status(404).json({ error: 'Not Found', message: 'Workout plan not found' });
        }

        res.json({ workoutPlan: workout });
    } catch (err) {
        console.error('Update workout plan error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Delete workout plan
 */
exports.deleteWorkoutPlan = async (req, res) => {
    try {
        const workout = await Workout.delete(req.params.workoutPlanId);

        if (!workout) {
            return res.status(404).json({ error: 'Not Found', message: 'Workout plan not found' });
        }

        res.json({ message: 'Workout plan deleted successfully' });
    } catch (err) {
        console.error('Delete workout plan error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Start workout
 */
exports.startWorkout = async (req, res) => {
    try {
        const workout = await Workout.start(req.params.workoutPlanId);

        if (!workout) {
            return res.status(404).json({ error: 'Not Found', message: 'Workout plan not found' });
        }

        res.json({
            id: workout.id.toString(),
            status: workout.status,
            startedAt: workout.started_at
        });
    } catch (err) {
        console.error('Start workout error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Complete workout
 */
exports.completeWorkout = async (req, res) => {
    try {
        const workout = await Workout.complete(req.params.workoutPlanId);

        if (!workout) {
            return res.status(404).json({ error: 'Not Found', message: 'Workout plan not found' });
        }

        res.json({
            status: workout.status,
            completedAt: workout.completed_at
        });

        // Notify Coach
        await notifyCoachOnCompletion(req.params.workoutPlanId);
    } catch (err) {
        console.error('Complete workout error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Notify coach on workout completion (Helper refactor needed to be clean, inserting here)
 */
const notifyCoachOnCompletion = async (workoutId) => {
    try {
        const workout = await Workout.findByIdWithExercises(workoutId);
        if (workout && workout.coach_id) {
            const traineeResult = await require('../config/database').query('SELECT name FROM users WHERE id = $1', [workout.trainee_id]);
            const traineeName = traineeResult.rows[0]?.name || 'Trainee';

            // Only notify if coach is not the trainee (prevent self-notification)
            if (workout.coach_id !== workout.trainee_id) {
                await NotificationController.createNotification(
                    workout.coach_id,
                    'Workout Completed',
                    JSON.stringify({ name: traineeName, workoutName: workout.name }),
                    'workout_completed',
                    workout.id,
                    true // sendPush = true (will add config option to disable in future)
                );
            }
        }
    } catch (e) { console.error('Notify coach error', e); }
};

/**
 * Add exercises to workout plan
 */
exports.addExercises = async (req, res) => {
    try {
        const { exercises } = req.body;
        const { planId } = req.params;

        if (!exercises || exercises.length === 0) {
            return res.status(400).json({ error: 'Bad Request', message: 'At least one exercise is required' });
        }

        const insertedExercises = await Workout.addExercises(planId, exercises);

        res.json({ exercises: insertedExercises });
    } catch (err) {
        console.error('Add exercises error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Delete exercise from workout plan
 */
exports.deleteExercise = async (req, res) => {
    try {
        const exercise = await Workout.deleteExercise(req.params.exerciseId);

        if (!exercise) {
            return res.status(404).json({ error: 'Not Found', message: 'Exercise not found' });
        }

        res.json({ message: 'Exercise deleted successfully' });
    } catch (err) {
        console.error('Delete exercise error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update exercise details (notes)
 */
exports.updateExercise = async (req, res) => {
    try {
        const { notes } = req.body;
        const { exerciseId } = req.params;

        const exercise = await Workout.updateExercise(exerciseId, { notes });

        if (!exercise) {
            return res.status(404).json({ error: 'Not Found', message: 'Exercise not found' });
        }

        res.json({ exercise });
    } catch (err) {
        console.error('Update exercise error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Log exercise set
 */
exports.logExerciseSet = async (req, res) => {
    try {
        const { setNumber, repsCompleted, weightUsed, weightUnit, notes, rpe, rir, distance, duration, calories } = req.body;
        const { workoutPlanId, exerciseId } = req.params;

        const log = await Workout.logExerciseSet(workoutPlanId, exerciseId, {
            setNumber,
            repsCompleted,
            weightUsed,
            weightUnit,
            notes,
            rpe,
            rir,
            distance,
            duration,
            calories
        });

        res.status(201).json({
            id: log.id.toString(),
            workoutPlanId: log.workout_plan_id ? log.workout_plan_id.toString() : undefined,
            exerciseId: log.exercise_id.toString(),
            setNumber: log.set_number,
            repsCompleted: log.reps_completed,
            weightUsed: parseFloat(log.weight_used),
            weightUnit: log.weight_unit,
            notes: log.notes,
            rpe: log.rpe,
            rir: log.rir,
            distance: log.distance,
            duration: log.duration,
            calories: log.calories,
            completed: log.completed,
            loggedAt: log.logged_at
        });
    } catch (err) {
        console.error('Log exercise error details:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            table: err.table,
            constraint: err.constraint,
            stack: err.stack
        });
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            details: err.detail || err.code // Send more info to client for debugging
        });
    }
};

/**
 * Update exercise log
 */
exports.updateExerciseLog = async (req, res) => {
    try {
        const { setNumber, repsCompleted, weightUsed, weightUnit, notes, rpe, rir, distance, duration, calories } = req.body;
        const { logId } = req.params;

        const log = await Workout.updateExerciseLog(logId, {
            setNumber,
            repsCompleted,
            weightUsed,
            weightUnit,
            notes,
            rpe,
            rir,
            distance,
            duration,
            calories
        });

        if (!log) {
            return res.status(404).json({ error: 'Not Found', message: 'Log not found' });
        }

        res.json({
            id: log.id.toString(),
            setNumber: log.set_number,
            repsCompleted: log.reps_completed,
            weightUsed: parseFloat(log.weight_used),
            weightUnit: log.weight_unit,
            notes: log.notes,
            rpe: log.rpe,
            rir: log.rir,
            rpe: log.rpe,
            rir: log.rir,
            distance: log.distance,
            duration: log.duration,
            calories: log.calories,
            loggedAt: log.logged_at
        });
    } catch (err) {
        console.error('Update log error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get exercise logs
 */
exports.getExerciseLogs = async (req, res) => {
    try {
        const logs = await Workout.getExerciseLogs(req.params.exerciseId);

        res.json({
            logs: logs.map(log => ({
                id: log.id.toString(),
                setNumber: log.set_number,
                repsCompleted: log.reps_completed,
                weightUsed: parseFloat(log.weight_used),
                weightUnit: log.weight_unit,
                notes: log.notes,
                rpe: log.rpe,
                rir: log.rir,
                rpe: log.rpe,
                rir: log.rir,
                distance: log.distance,
                duration: log.duration,
                calories: log.calories,
                completed: log.completed,
                loggedAt: log.logged_at
            }))
        });
    } catch (err) {
        console.error('Get exercise logs error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Delete exercise log
 */
exports.deleteExerciseLog = async (req, res) => {
    try {
        const log = await Workout.deleteExerciseLog(req.params.logId);

        if (!log) {
            return res.status(404).json({ error: 'Not Found', message: 'Log not found' });
        }

        res.json({ message: 'Log deleted successfully' });
    } catch (err) {
        console.error('Delete log error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};
/**
 * Get progression data
 */
exports.getProgression = async (req, res) => {
    try {
        const { userId } = req.params;
        const { exercise } = req.query;

        if (!exercise) {
            return res.status(400).json({ error: 'Bad Request', message: 'Exercise name is required' });
        }

        const logs = await Workout.getProgression(userId, exercise);

        // Calculate 1RM and format data
        const progression = logs.map(log => {
            // Epley Formula: 1RM = Weight * (1 + Reps/30)
            const oneRepMax = log.weight_used * (1 + log.reps_completed / 30);
            return {

                date: log.completed_at || log.scheduled_date,
                weight: parseFloat(log.weight_used),
                reps: log.reps_completed,
                setNumber: log.set_number,
                rpe: log.rpe,
                rir: log.rir,
                workoutPlanId: log.workout_plan_id,
                oneRepMax: Math.round(oneRepMax * 10) / 10 // Round to 1 decimal
            };
        });

        res.json({ progression });
    } catch (err) {
        console.error('Get progression error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get unique exercises for a user
 */
exports.getUniqueExercises = async (req, res) => {
    try {
        const { userId } = req.params;
        const exercises = await Workout.getUniqueExercises(userId);
        res.json({ exercises });
    } catch (err) {
        console.error('Get unique exercises error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};
