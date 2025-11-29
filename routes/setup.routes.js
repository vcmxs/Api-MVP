// routes/setup.routes.js
// TEMPORARY ROUTE - DELETE AFTER USE
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Fix workout_templates table
router.get('/fix-templates-table', async (req, res) => {
    try {
        // Drop the old table if it exists
        await pool.query('DROP TABLE IF EXISTS workout_templates CASCADE');

        // Create the new table with correct schema
        await pool.query(`
            CREATE TABLE workout_templates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                exercises JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        res.json({
            success: true,
            message: 'workout_templates table fixed successfully!'
        });
    } catch (err) {
        console.error('Fix table error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;
