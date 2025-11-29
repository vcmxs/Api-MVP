// controllers/template.controller.js
const pool = require('../db');

/**
 * Create a new workout template
 */
exports.createTemplate = async (req, res) => {
    try {
        const { userId, name, description, exercises } = req.body;

        if (!userId || !name || !exercises || exercises.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'userId, name, and exercises are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO workout_templates (user_id, name, description, exercises, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [userId, name, description || '', JSON.stringify(exercises)]
        );

        res.status(201).json({
            template: result.rows[0]
        });
    } catch (err) {
        console.error('Create template error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};

/**
 * Get all templates for a user
 */
exports.getUserTemplates = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT * FROM workout_templates 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        // Parse the exercises JSON for each template
        const templates = result.rows.map(template => ({
            ...template,
            exercises: typeof template.exercises === 'string'
                ? JSON.parse(template.exercises)
                : template.exercises
        }));

        res.json({
            templates
        });
    } catch (err) {
        console.error('Get templates error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};

/**
 * Update a template
 */
exports.updateTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        const { name, description, exercises } = req.body;

        if (!name || !exercises || exercises.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'name and exercises are required'
            });
        }

        const result = await pool.query(
            `UPDATE workout_templates 
             SET name = $1, description = $2, exercises = $3
             WHERE id = $4
             RETURNING *`,
            [name, description || '', JSON.stringify(exercises), templateId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Template not found'
            });
        }

        res.json({
            message: 'Template updated successfully',
            template: result.rows[0]
        });
    } catch (err) {
        console.error('Update template error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};

/**
 * Delete a template
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;

        const result = await pool.query(
            'DELETE FROM workout_templates WHERE id = $1 RETURNING *',
            [templateId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Template not found'
            });
        }

        res.json({
            message: 'Template deleted successfully',
            template: result.rows[0]
        });
    } catch (err) {
        console.error('Delete template error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};

