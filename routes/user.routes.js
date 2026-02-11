// routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../config/upload');
const { authenticateToken } = require('../middleware/auth');

// Weight History
router.get('/:userId/weight-history', authenticateToken, userController.getWeightHistory);

// User profile routes
router.get('/:userId', userController.getUserById);
router.get('/:userId/profile', userController.getUserProfile);
router.put('/:userId/profile', userController.updateUserProfile);
router.put('/:userId/profile-picture', upload.single('profilePic'), userController.updateProfilePicture);
router.put('/coaches/:coachId/trainees/:traineeId/subscription', userController.updateTraineeSubscription);
router.get('/coaches/:coachId/trainees/:traineeId/history', userController.getCoachTraineeHistory);
router.delete('/:userId/account', authenticateToken, userController.deleteOwnAccount);
router.delete('/:userId/connection/:targetId', userController.removeConnection);

module.exports = router;
