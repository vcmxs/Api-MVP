// routes/coach.routes.js
const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Coach-trainee management routes
router.get('/:coachId/trainees', userController.getCoachTrainees);
router.post('/:coachId/trainees', userController.assignTrainee);

// Revenue (authenticated)
router.get('/:coachId/monthly-revenue', authenticateToken, userController.getCoachMonthlyRevenue);

// Blast message to trainees (authenticated)
router.post('/:coachId/blast', authenticateToken, userController.blastMessage);

module.exports = router;
