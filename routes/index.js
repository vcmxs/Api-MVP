// routes/index.js
const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const coachRoutes = require('./coach.routes');
const workoutRoutes = require('./workout.routes');
const traineeRoutes = require('./trainee.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/coaches', coachRoutes);
router.use('/workout-plans', workoutRoutes);
router.use('/trainees', traineeRoutes);
router.use('/admin', adminRoutes);

// Optional routes (can be added later)
// router.use('/exercises', exerciseRoutes);
// router.use('/workout-templates', templateRoutes);

module.exports = router;
