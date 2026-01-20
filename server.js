// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import modular routes
const apiRoutes = require('./routes');

const app = express();
app.set('trust proxy', 1); // Required for Railway/Heroku to key rate limiting off IP
const PORT = process.env.PORT || 3000;

// Rate limiting configuration
// General API rate limiter - 1000 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication endpoints - 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too Many Login Attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});


// Middleware
app.use(cors({
  origin: '*', // Allow all origins for now (can be restricted later)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token']
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply rate limiting to all API routes
app.use('/api/v1', apiLimiter);

// Apply stricter rate limiting to auth routes
// app.use('/api/v1/auth/login', authLimiter);
// app.use('/api/v1/auth/register', authLimiter);

// Mount API routes
app.use('/api/v1', apiRoutes);

// ============================================
// EXERCISE ROUTES (Temporary - until refactored)
// ============================================

// Get all exercises
app.get('/api/v1/exercises', async (req, res) => {
  const { category } = req.query;
  const pool = require('./config/database');

  try {
    let query = 'SELECT * FROM exercise_library ORDER BY muscle_category, name';
    let params = [];

    // Filter by category if provided
    if (category) {
      query = 'SELECT * FROM exercise_library WHERE muscle_category = $1 ORDER BY name';
      params = [category];
    }

    const result = await pool.query(query, params);

    res.json({
      exercises: result.rows
    });
  } catch (err) {
    console.error('Get exercises error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Get unique muscle categories
app.get('/api/v1/exercises/categories', async (req, res) => {
  const pool = require('./config/database');

  try {
    const result = await pool.query(
      'SELECT DISTINCT muscle_category FROM exercise_library WHERE muscle_category IS NOT NULL AND muscle_category != \'\' ORDER BY muscle_category'
    );

    const categories = result.rows.map(row => row.muscle_category);

    res.json({
      categories
    });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Gym Training API is running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/v1`);
  console.log(`✅ All routes loaded successfully`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   - Auth: /api/v1/auth/*`);
  console.log(`   - Users: /api/v1/users/*`);
  console.log(`   - Coaches: /api/v1/coaches/*`);
  console.log(`   - Workouts: /api/v1/workout-plans/*`);
  console.log(`   - Trainees: /api/v1/trainees/*`);
  console.log(`   - Admin: /api/v1/admin/*`);
  console.log(`   - Uploads: /uploads/*`);
});

// Add a delay to ensure database connection is ready before accepting requests (optional but helpful in some envs)
setTimeout(() => {
  console.log('Server ready to accept requests');
}, 1000);