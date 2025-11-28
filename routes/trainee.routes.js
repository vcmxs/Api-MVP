// routes/trainee.routes.js
const express = require('express');
const workoutController = require('../controllers/workout.controller');

const router = express.Router();

// Get all workout plans for a trainee
router.get('/:traineeId/workout-plans', workoutController.getTraineeWorkoutPlans);

module.exports = router;
