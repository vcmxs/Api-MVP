// routes/user.routes.js
const express = require('express');
const userController = require('../controllers/user.controller');
const upload = require('../config/upload');

const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// User profile routes
router.get('/:userId', userController.getUserById);
router.get('/:userId/profile', userController.getUserProfile);
router.put('/:userId/profile', userController.updateUserProfile);
router.put('/:userId/profile-picture', upload.single('profilePic'), userController.updateProfilePicture);
router.delete('/:userId/account', authenticateToken, userController.deleteOwnAccount);
router.delete('/:userId/connection/:targetId', userController.removeConnection);

module.exports = router;
