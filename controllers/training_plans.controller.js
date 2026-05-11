const pool = require('../db');

exports.getPlans = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            'SELECT * FROM training_plans WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json({ plans: result.rows });
    } catch (err) {
        console.error('Error fetching training plans:', err);
        res.status(500).json({ error: 'Server error fetching training plans' });
    }
};

exports.createPlan = async (req, res) => {
    try {
        const { id, user_id, program_folder_id, name, description, duration_weeks, is_reusable, schedule } = req.body;
        
        // Normalise schedule: JSONB column accepts an object or JSON string
        let scheduleValue = schedule;
        if (typeof schedule === 'string') {
            try { scheduleValue = JSON.parse(schedule); } catch { scheduleValue = {}; }
        }

        const result = await pool.query(
            `INSERT INTO training_plans 
            (id, user_id, program_folder_id, name, description, duration_weeks, is_reusable, schedule) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [id, user_id, program_folder_id || null, name, description || '', duration_weeks, is_reusable, JSON.stringify(scheduleValue)]
        );
        
        res.status(201).json({ plan: result.rows[0] });
    } catch (err) {
        console.error('Error creating training plan:', err);
        res.status(500).json({ error: err.message || 'Server error creating training plan' });
    }
};


exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, duration_weeks, is_reusable, program_folder_id, schedule } = req.body;
        
        let scheduleValue = schedule;
        if (typeof schedule === 'string') {
            try { scheduleValue = JSON.parse(schedule); } catch { scheduleValue = {}; }
        }

        const result = await pool.query(
            `UPDATE training_plans 
             SET name = $1, description = $2, duration_weeks = $3, is_reusable = $4, program_folder_id = $5, schedule = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [name, description || '', duration_weeks, is_reusable, program_folder_id || null, JSON.stringify(scheduleValue), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.json({ plan: result.rows[0] });
    } catch (err) {
        console.error('Error updating training plan:', err);
        res.status(500).json({ error: err.message || 'Server error updating training plan' });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM training_plans WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        
        res.json({ message: 'Training plan deleted successfully', deletedPlan: result.rows[0] });
    } catch (err) {
        console.error('Error deleting training plan:', err);
        res.status(500).json({ error: 'Server error deleting training plan' });
    }
};
