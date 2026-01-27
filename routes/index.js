// routes/index.js
const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const coachRoutes = require('./coach.routes');
const workoutRoutes = require('./workout.routes');
const traineeRoutes = require('./trainee.routes');
const adminRoutes = require('./admin.routes');
const templateRoutes = require('./template.routes');
const setupRoutes = require('./setup.routes');
const nutritionRoutes = require('./nutrition.routes');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/coaches', coachRoutes);
router.use('/workout-plans', workoutRoutes);
router.use('/trainees', traineeRoutes);
router.use('/admin', adminRoutes);
router.use('/workout-templates', templateRoutes);
router.use('/setup', setupRoutes);
router.use('/setup', setupRoutes);
router.use('/nutrition', nutritionRoutes);
router.use('/referrals', require('./referral.routes'));
router.use('/notifications', require('./notification.routes'));
// TEMPORARILY DISABLED: Uncomment after Railway cache clears
router.use('/push-tokens', require('./pushToken.routes'));

// Optional routes (can be added later)
// router.use('/exercises', exerciseRoutes);

module.exports = router;