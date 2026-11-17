// routes/workout.routes.js
const express = require('express');
const workoutController = require('../controllers/workout.controller');
const { requireActiveSubscription, authenticateToken } = require('../middleware/auth');
const { loadWorkoutPlan } = require('../middleware/plan-access');

const router = express.Router();

// Every workout-plan route is private: plan ids are sequential integers, so an
// anonymous request could otherwise read or overwrite another trainee's plan.
// `loadWorkoutPlan` additionally checks the caller is that plan's trainee, its
// coach or an admin.

// Workout plan CRUD
router.post('/', requireActiveSubscription, workoutController.createWorkoutPlan);
router.post('/shared', requireActiveSubscription, workoutController.createSharedWorkoutSession);
router.get('/shared/:sharedSessionId', authenticateToken, workoutController.getSharedSessionById);
router.get('/:workoutPlanId', authenticateToken, loadWorkoutPlan(), workoutController.getWorkoutPlanById);
// Completed sessions are history: no edits, no deletions.
router.put('/:workoutPlanId', authenticateToken, loadWorkoutPlan({ blockCompleted: true }), workoutController.updateWorkoutPlan);
router.put('/:planId', requireActiveSubscription, loadWorkoutPlan({ blockCompleted: true }), workoutController.updateWorkoutPlan); // Alternate route
router.delete('/:workoutPlanId', authenticateToken, loadWorkoutPlan({ blockCompleted: true }), workoutController.deleteWorkoutPlan);

// Workout session management
router.post('/:workoutPlanId/start', authenticateToken, loadWorkoutPlan(), workoutController.startWorkout);
router.post('/:workoutPlanId/complete', authenticateToken, loadWorkoutPlan(), workoutController.completeWorkout);

// Exercise management
router.post('/:planId/exercises', requireActiveSubscription, loadWorkoutPlan({ blockCompleted: true }), workoutController.addExercises);
router.delete('/:planId/exercises/:exerciseId', requireActiveSubscription, loadWorkoutPlan({ blockCompleted: true }), workoutController.deleteExercise);
router.put('/:planId/exercises/:exerciseId', authenticateToken, loadWorkoutPlan({ blockCompleted: true }), workoutController.updateExercise);

// Exercise logging
router.post('/:workoutPlanId/exercises/:exerciseId/logs', authenticateToken, loadWorkoutPlan(), workoutController.logExerciseSet);
router.get('/:workoutPlanId/exercises/:exerciseId/logs', authenticateToken, loadWorkoutPlan(), workoutController.getExerciseLogs);
router.put('/:workoutPlanId/exercises/:exerciseId/logs/:logId', authenticateToken, loadWorkoutPlan(), workoutController.updateExerciseLog);
router.delete('/:workoutPlanId/exercises/:exerciseId/logs/:logId', authenticateToken, loadWorkoutPlan(), workoutController.deleteExerciseLog);

router.get('/users/:userId/progression', authenticateToken, workoutController.getProgression);
router.get('/users/:userId/exercises', authenticateToken, workoutController.getUniqueExercises);

module.exports = router;

