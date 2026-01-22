// controllers/notification.controller.js
const pool = require('../config/database');
const { Expo } = require('expo-server-sdk');

// Initialize Expo SDK
const expo = new Expo();

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
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `DELETE FROM notifications 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Internal helper to create a notification AND send push notification
 * This is NOT an API endpoint, but a function to be called by other controllers
 */
exports.createNotification = async (userId, title, message, type, relatedId = null) => {
    try {
        // Insert notification into database
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, title, message, type, relatedId]
        );
        console.log(`Notification created for user ${userId}: ${title}`);

        // Send push notification to all user's devices
        await sendPushNotification(userId, title, message, { type, relatedId });
    } catch (err) {
        console.error('Create notification error:', err);
        // Do not throw, just log. We don't want to fail the main transaction if notif fails
    }
};

/**
 * Helper function to send push notifications via Expo
 */
async function sendPushNotification(userId, title, body, data = {}) {
    try {
        // Get all push tokens for this user
        const tokensResult = await pool.query(
            'SELECT token FROM push_tokens WHERE user_id = $1',
            [userId]
        );

        if (tokensResult.rows.length === 0) {
            console.log(`No push tokens found for user ${userId}`);
            return;
        }

        const pushTokens = tokensResult.rows.map(row => row.token);

        // Create messages for Expo
        const messages = [];
        for (const pushToken of pushTokens) {
            // Check that the token is valid
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: pushToken,
                sound: 'default',
                title: title,
                body: body,
                data: data,
            });
        }

        // Send in chunks (Expo recommends batching)
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Push notification tickets:', ticketChunk);

                // Check for errors
                ticketChunk.forEach((ticket, index) => {
                    if (ticket.status === 'error') {
                        console.error(`Error sending push to ${chunk[index].to}:`, ticket.message);
                        // Optionally: Remove invalid tokens from database
                        if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                            pool.query('DELETE FROM push_tokens WHERE token = $1', [chunk[index].to])
                                .catch(err => console.error('Error deleting invalid token:', err));
                        }
                    }
                });
            } catch (error) {
                console.error('Error sending push notification chunk:', error);
            }
        }
    } catch (err) {
        console.error('Send push notification error:', err);
    }
}

