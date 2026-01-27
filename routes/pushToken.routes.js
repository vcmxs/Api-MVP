// routes/pushToken.routes.js
const express = require('express');
const router = express.Router();
const pushTokenController = require('../controllers/pushToken.controller');
const { authenticateToken } = require('../middleware/auth');

// Register a push token
router.post('/register', authenticateToken, pushTokenController.registerToken);

// Remove a push token
router.delete('/remove', authenticateToken, pushTokenController.removeToken);

module.exports = router;
