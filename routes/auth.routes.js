// routes/auth.routes.js
const express = require('express');
const authController = require('../controllers/auth.controller');
const upload = require('../config/upload');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Stricter rate limiter for authentication endpoints - 20 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per windowMs
    message: {
        error: 'Too Many Login Attempts',
        message: 'Too many login attempts from this IP, please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});

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
router.post('/request-delete-account', authLimiter, authController.requestDeleteAccount);
router.post('/confirm-delete-account', authController.confirmDeleteAccount);

// GET /api/v1/auth/me
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
