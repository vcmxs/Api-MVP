const { Pool } = require('pg');
const db = require('../db');

// Get all programs for a coach with workout counts
exports.getPrograms = async (req, res) => {
    try {
        const { userId } = req.params;

        const query = `
            SELECT p.*, COUNT(wt.id) as workout_count
            FROM programs p
            LEFT JOIN workout_templates wt ON p.id = wt.program_id
            WHERE p.user_id = $1
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;

        const result = await db.query(query, [userId]);
        res.json({ success: true, programs: result.rows });
    } catch (err) {
        console.error('Error getting programs:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new program
exports.createProgram = async (req, res) => {
    try {
        const { userId, name, description, hexColor } = req.body;

        if (!userId || !name) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Default nice indigo color if none provided
        const color = hexColor || '#4F46E5';

        const result = await db.query(
            'INSERT INTO programs (user_id, name, description, hex_color) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, name, description, color]
        );

        res.json({ success: true, program: result.rows[0] });
    } catch (err) {
        console.error('Error creating program:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update a program
exports.updateProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, hexColor } = req.body;

        const result = await db.query(
            `UPDATE programs 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 hex_color = COALESCE($3, hex_color),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 
             RETURNING *`,
            [name, description, hexColor, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }

        res.json({ success: true, program: result.rows[0] });
    } catch (err) {
        console.error('Error updating program:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a program
exports.deleteProgram = async (req, res) => {
    try {
        const { id } = req.params;

        // Note: workout_templates with this program_id will define their behavior based on FK constraint (SET NULL)
        const result = await db.query('DELETE FROM programs WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }

        res.json({ success: true, message: 'Program deleted' });
    } catch (err) {
        console.error('Error deleting program:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all workouts (templates) in a program
exports.getProgramWorkouts = async (req, res) => {
    try {
        const { id } = req.params;

        // First get program details
        const programResult = await db.query('SELECT * FROM programs WHERE id = $1', [id]);

        if (programResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }

        // Then get templates
        const query = `
            SELECT * FROM workout_templates 
            WHERE program_id = $1 
            ORDER BY created_at DESC
        `;
        const templatesResult = await db.query(query, [id]);

        // For each template, fetch its exercises
        const templates = templatesResult.rows;

        for (let template of templates) {
            const exercisesResult = await db.query(
                'SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY exercise_order ASC',
                [template.id]
            );
            template.exercises = exercisesResult.rows;
        }

        res.json({
            success: true,
            program: programResult.rows[0],
            workouts: templates
        });

    } catch (err) {
        console.error('Error getting program workouts:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Add/Move a workout template to a program
exports.addWorkoutToProgram = async (req, res) => {
    try {
        const { id } = req.params; // Program ID
        const { templateId } = req.body;

        const result = await db.query(
            'UPDATE workout_templates SET program_id = $1 WHERE id = $2 RETURNING *',
            [id, templateId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Workout template not found' });
        }

        res.json({ success: true, workout: result.rows[0] });

    } catch (err) {
        console.error('Error adding workout to program:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Remove a workout template from a program
exports.removeWorkoutFromProgram = async (req, res) => {
    try {
        const { id, templateId } = req.params;

        const result = await db.query(
            'UPDATE workout_templates SET program_id = NULL WHERE id = $1 AND program_id = $2 RETURNING *',
            [templateId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Workout not found in this program' });
        }

        res.json({ success: true, workout: result.rows[0] });

    } catch (err) {
        console.error('Error removing workout from program:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
