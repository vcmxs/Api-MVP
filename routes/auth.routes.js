// routes/auth.routes.js
const express = require('express');
const authController = require('../controllers/auth.controller');
const upload = require('../config/upload');

const router = express.Router();

// POST /api/v1/auth/register - with optional profile picture upload
router.post('/register', upload.single('profilePic'), authController.register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, authController.login);

// POST /api/v1/auth/google
router.post('/google-login', authLimiter, authController.googleLogin);

// New Security and Verification endpoints
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-pin', authLimiter, authController.resendPin);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
