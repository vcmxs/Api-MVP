// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database (this will trigger table creation)
const db = require('./db');

// Import modular routes
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Wait for database initialization before starting server
setTimeout(() => {
  app.listen(PORT, () => {
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
}, 3000); // Wait 3 seconds for database tables to be created
