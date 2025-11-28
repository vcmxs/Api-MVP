// routes/workout.routes.js
const express = require('express');
const workoutController = require('../controllers/workout.controller');
const { requireActiveSubscription } = require('../middleware/auth');

const router = express.Router();

// Workout plan CRUD
router.post('/', requireActiveSubscription, workoutController.createWorkoutPlan);
router.get('/:workoutPlanId', workoutController.getWorkoutPlanById);
router.put('/:workoutPlanId', workoutController.updateWorkoutPlan);
router.put('/:planId', requireActiveSubscription, workoutController.updateWorkoutPlan); // Alternate route
router.delete('/:workoutPlanId', workoutController.deleteWorkoutPlan);

// Workout session management
router.post('/:workoutPlanId/start', workoutController.startWorkout);
router.post('/:workoutPlanId/complete', workoutController.completeWorkout);

// Exercise management
router.post('/:planId/exercises', requireActiveSubscription, workoutController.addExercises);
router.delete('/:planId/exercises/:exerciseId', requireActiveSubscription, workoutController.deleteExercise);

// Exercise logging
router.post('/:workoutPlanId/exercises/:exerciseId/logs', workoutController.logExerciseSet);
router.get('/:workoutPlanId/exercises/:exerciseId/logs', workoutController.getExerciseLogs);
router.delete('/:workoutPlanId/exercises/:exerciseId/logs/:logId', workoutController.deleteExerciseLog);

router.get('/users/:userId/progression', workoutController.getProgression);
router.get('/users/:userId/exercises', workoutController.getUniqueExercises);

module.exports = router;
