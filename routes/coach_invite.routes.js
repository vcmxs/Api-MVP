// routes/coach_invite.routes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const coachInviteController = require('../controllers/coach_invite.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public endpoint: opens from a shared link /join/CODE, so it needs a limit.
const previewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message: {
        error: 'Too Many Requests',
        message: 'Too many invite lookups from this IP, please try again later.'
    }
});

// GET /api/v1/coach-invites/:code - public preview (coach name + free slots)
router.get('/:code', previewLimiter, coachInviteController.previewInvite);

// POST /api/v1/coach-invites/apply - link the logged-in account to the coach
router.post('/apply', authenticateToken, coachInviteController.applyInvite);

module.exports = router;
