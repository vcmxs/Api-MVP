// server.js - REFACTORED
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const routes = require('./routes');
const { requireAdmin, requireActiveSubscription } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/v1', routes);

// ============================================
// TEMPORARY: OLD ROUTES BELOW
// TODO: Refactor these routes into separate modules
// ============================================

// NOTE: The auth routes have been refactored and moved to routes/auth.routes.js
// The following routes still need to be refactored:
// - User routes (/api/v1/users/*)
// - Workout routes (/api/v1/workout-plans/*, /api/v1/trainees/*/workout-plans/*)
// - Exercise routes (/api/v1/exercises/*)
// - Admin routes (/api/v1/admin/*)
// - Subscription routes (/api/v1/subscriptions/*)

// For now, we'll keep the old routes below to maintain functionality
// We'll refactor them one by one in the next steps

const pool = require('./db'); // Using old db.js for now, will migrate to config/database.js

// ============================================
// USER ROUTES (TO BE REFACTORED)
// ============================================
