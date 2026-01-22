// routes/pushToken.routes.js
const express = require('express');
const router = express.Router();
const pushTokenController = require('../controllers/pushToken.controller');
const authMiddleware = require('../middleware/auth');

// Register a push token
router.post('/register', authMiddleware, pushTokenController.registerToken);

// Remove a push token
router.delete('/remove', authMiddleware, pushTokenController.removeToken);

module.exports = router;
