// controllers/notification.controller.js
const pool = require('../config/database');

/**
 * Get all notifications for the authenticated user
 */
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware

        const result = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );

        res.json({
            notifications: result.rows
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Mark a notification as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Notification not found' });
        }

        res.json({ notification: result.rows[0] });
    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Mark ALL notifications as read for user
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE user_id = $1`,
            [userId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Internal helper to create a notification
 * This is NOT an API endpoint, but a function to be called by other controllers
 */
exports.createNotification = async (userId, title, message, type, relatedId = null) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, title, message, type, relatedId]
        );
        console.log(`Notification created for user ${userId}: ${title}`);
    } catch (err) {
        console.error('Create notification error:', err);
        // Do not throw, just log. We don't want to fail the main transaction if notif fails
    }
};
