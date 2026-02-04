// controllers/template.controller.js
const pool = require('../db');

/**
 * Create a new workout template
 */
exports.createTemplate = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { userId, name, description, programId, exercises } = req.body;

        if (!userId || !name || !exercises || exercises.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'userId, name, and exercises are required'
            });
        }

        // 1. Insert Template Header
        const templateResult = await client.query(
            `INSERT INTO workout_templates (user_id, name, description, program_id, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [userId, name, description || '', programId || null]
        );
        const template = templateResult.rows[0];

        // 2. Insert Exercises
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            await client.query(
                `INSERT INTO template_exercises 
                (template_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    template.id,
                    ex.name,
                    ex.sets || 3,
                    ex.reps || 10,
                    ex.targetWeight || 0,
                    ex.weightUnit || 'kg',
                    ex.restTime || 60,
                    ex.notes || '',
                    i // order
                ]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            template: { ...template, exercises }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create template error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    } finally {
        client.release();
    }
};

/**
 * Get all templates for a user (optionally filtered by program)
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

        const templates = result.rows;

        // Populate exercises for each template
        for (let template of templates) {
            const exResult = await pool.query(
                `SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY exercise_order ASC`,
                [template.id]
            );
            template.exercises = exResult.rows;
        }

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
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { templateId } = req.params;
        const { name, description, exercises } = req.body;

        if (!name || !exercises || exercises.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'name and exercises are required'
            });
        }

        // 1. Update Header
        const result = await client.query(
            `UPDATE workout_templates 
             SET name = $1, description = $2
             WHERE id = $3
             RETURNING *`,
            [name, description || '', templateId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'Not Found',
                message: 'Template not found'
            });
        }
        const template = result.rows[0];

        // 2. Replace Exercises (Delete all, then Insert new)
        await client.query('DELETE FROM template_exercises WHERE template_id = $1', [templateId]);

        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            await client.query(
                `INSERT INTO template_exercises 
                (template_id, name, sets, reps, target_weight, weight_unit, rest_time, notes, exercise_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    template.id,
                    ex.name,
                    ex.sets || 3,
                    ex.reps || 10,
                    ex.targetWeight || 0,
                    ex.weightUnit || 'kg',
                    ex.restTime || 60,
                    ex.notes || '',
                    i
                ]
            );
        }

        await client.query('COMMIT');

        res.json({
            message: 'Template updated successfully',
            template: { ...template, exercises }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update template error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    } finally {
        client.release();
    }
};

/**
 * Delete a template
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;

        // Cascade delete should handle template_exercises, but good to be safe if not configured
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
