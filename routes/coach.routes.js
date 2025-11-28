// routes/coach.routes.js
const express = require('express');
const userController = require('../controllers/user.controller');

const router = express.Router();

// Coach-trainee management routes
router.get('/:coachId/trainees', userController.getCoachTrainees);
router.post('/:coachId/trainees', userController.assignTrainee);

module.exports = router;
