const express = require('express');
const router = express.Router();
const programsController = require('../controllers/programs.controller');

// List programs for a user (Coach)
router.get('/users/:userId', programsController.getPrograms);

// Create new program
router.post('/', programsController.createProgram);

// Get specific program details + workouts
router.get('/:id/workouts', programsController.getProgramWorkouts);

// Update program
router.put('/:id', programsController.updateProgram);

// Delete program
router.delete('/:id', programsController.deleteProgram);

// Add workout to program
router.post('/:id/workouts', programsController.addWorkoutToProgram);

// Remove workout from program
router.delete('/:id/workouts/:templateId', programsController.removeWorkoutFromProgram);

module.exports = router;
