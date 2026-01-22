// controllers/pushToken.controller.js
const pool = require('../config/database');

/**
 * Register a push notification token for the authenticated user
 */
exports.registerToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { token, deviceType } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Check if token already exists for this user
        const existing = await pool.query(
            'SELECT * FROM push_tokens WHERE token = $1',
            [token]
        );

        if (existing.rows.length > 0) {
            // Update last_used_at
            await pool.query(
                'UPDATE push_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = $1',
                [token]
            );
            return res.json({ message: 'Token already registered', token: existing.rows[0] });
        }

        // Insert new token
        const result = await pool.query(
            `INSERT INTO push_tokens (user_id, token, device_type) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [userId, token, deviceType || null]
        );

        res.json({ message: 'Push token registered successfully', token: result.rows[0] });
    } catch (err) {
        console.error('Register push token error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Remove a push notification token (on logout)
 */
exports.removeToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]);

        res.json({ message: 'Push token removed successfully' });
    } catch (err) {
        console.error('Remove push token error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};
