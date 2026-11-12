// controllers/notification.controller.js
const pool = require('../config/database');
const { Expo } = require('expo-server-sdk');
const { buildNotificationText, parseNotificationParams } = require('../services/notificationI18n');

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
 * Mark ALL notifications as read for user.
 *
 * Message notifications (`direct_message`) are intentionally excluded: they only
 * become read when the user opens that conversation (or marks them explicitly),
 * so opening the bell / notifications panel does not hide unread chats.
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE user_id = $1 AND is_read = FALSE AND type <> 'direct_message'
             RETURNING id`,
            [userId]
        );

        res.json({
            message: 'Notifications marked as read',
            updated: result.rowCount,
            skippedType: 'direct_message'
        });
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
 * POST /notifications/send
 *
 * Lets a coach (or the user themselves) trigger one of the templated
 * notifications, e.g. the manual subscription reminder from the revenue views.
 *
 * Body: { userId, type, days?, relatedId?, params?, title?, message? }
 */
exports.sendNotification = async (req, res) => {
    try {
        const requesterId = Number(req.user?.id);
        const requesterRole = String(req.user?.role || '').toLowerCase();
        const {
            userId, type = 'subscription_reminder', days, relatedId,
            params: rawParams, title: rawTitle, message: rawMessage,
        } = req.body || {};

        if (!Number.isInteger(requesterId)) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Invalid session' });
        }

        const targetId = parseInt(userId, 10);
        if (!Number.isInteger(targetId)) {
            return res.status(400).json({ error: 'Bad Request', message: 'userId is required' });
        }
        if (typeof type !== 'string' || !/^[a-z][a-z0-9_]{2,49}$/.test(type)) {
            return res.status(400).json({ error: 'Bad Request', message: 'type is invalid' });
        }

        // Authorization: self, admin, or the coach linked to that trainee
        if (targetId !== requesterId && requesterRole !== 'admin') {
            const link = await pool.query(
                'SELECT 1 FROM coach_trainee WHERE coach_id = $1 AND trainee_id = $2',
                [requesterId, targetId]
            );
            if (link.rowCount === 0) {
                return res.status(403).json({ error: 'Forbidden', message: 'You can only notify your own trainees' });
            }
        }

        const target = await pool.query(
            'SELECT id, name, subscription_end_date FROM users WHERE id = $1',
            [targetId]
        );
        if (target.rowCount === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        const targetUser = target.rows[0];
        const params = {
            ...parseNotificationParams(rawTitle),
            ...parseNotificationParams(rawMessage),
            ...parseNotificationParams(rawParams),
        };
        if (!params.name) params.name = targetUser.name;

        if (type === 'subscription_reminder') {
            if (typeof days !== 'undefined' && Number.isFinite(Number(days))) {
                params.days = Number(days);
            }
            if (targetUser.subscription_end_date) {
                const end = new Date(targetUser.subscription_end_date);
                if (typeof params.days === 'undefined') {
                    const remainingDays = Math.ceil((end.getTime() - Date.now()) / 86400000);
                    if (remainingDays > 0 && remainingDays <= 7) params.days = remainingDays;
                }
                if (!params.date) params.date = toDateOnly(end);
            }
        }

        // Blast keeps the human-written text; templated types store params JSON
        const isPlain = type === 'blast';
        const storedTitle = isPlain
            ? (typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle : `📢 ${targetUser.name}`)
            : JSON.stringify(params);
        const storedMessage = isPlain
            ? (typeof rawMessage === 'string' ? rawMessage : '')
            : JSON.stringify(params);

        await exports.createNotification(targetId, storedTitle, storedMessage, type, relatedId ?? null, true);

        res.status(201).json({
            success: true,
            message: `Notification sent to ${targetUser.name}`,
            params,
        });
    } catch (err) {
        console.error('Send notification error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Internal helper to create a notification AND send push notification
 * This is NOT an API endpoint, but a function to be called by other controllers
 */
exports.createNotification = async (userId, title, message, type, relatedId = null, sendPush = true) => {
    try {
        // Insert notification into database.
        // `title`/`message` hold JSON params (language-neutral) so every client
        // can render the copy in its own language. Plain text is still accepted
        // (blast messages) and used as-is.
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, title, message, type, relatedId]
        );
        console.log(`Notification created for user ${userId}: ${type}`);

        if (sendPush === false) return;

        // Send push notification to all user's devices, in the user's language
        const params = {
            ...parseNotificationParams(title),
            ...parseNotificationParams(message),
        };
        const language = await getUserLanguage(userId);
        const text = buildNotificationText(type, params, language, { title, message });
        await sendPushNotification(userId, text.title, text.body, { type, relatedId });
    } catch (err) {
        console.error('Create notification error:', err);
        // Do not throw, just log. We don't want to fail the main transaction if notif fails
    }
};

/**
 * Notification language for a user. Falls back to Spanish when the column or
 * value is not available (older databases, users created before 012).
 */
async function getUserLanguage(userId) {
    try {
        const result = await pool.query('SELECT language FROM users WHERE id = $1', [userId]);
        return result.rows[0]?.language || 'es';
    } catch {
        return 'es';
    }
}

// Local YYYY-MM-DD (never shifts the day, unlike toISOString on a date-only value)
function toDateOnly(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

// Export the push notification helper for direct use
exports.sendPushNotification = sendPushNotification;

