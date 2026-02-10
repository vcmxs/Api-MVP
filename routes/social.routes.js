const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const User = require('../models/User'); // Import User model
const { authenticateToken: auth } = require('../middleware/auth');

// --- Friend Request Logic ---

// Send Friend Request (using Friend Code)
router.post('/request', auth, async (req, res) => {
    try {
        const { friendCode } = req.body;
        const senderId = req.user.id;

        if (!friendCode) return res.status(400).json({ message: 'Friend code is required' });

        // Find user by code
        const receiver = await User.findByReferralCode(friendCode);
        if (!receiver) return res.status(404).json({ message: 'User not found' });

        if (receiver.id === senderId) return res.status(400).json({ message: 'You cannot add yourself' });

        // Check if relationship exists
        const existing = await pool.query(
            'SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
            [senderId, receiver.id]
        );

        if (existing.rows.length > 0) {
            const rel = existing.rows[0];
            if (rel.status === 'accepted') return res.status(400).json({ message: 'Already friends' });
            if (rel.status === 'pending') return res.status(400).json({ message: 'Request already pending' });
        }

        // Create Request (Order: Lower ID first to maintain unique constraint logic usually, but here strict unique across both combo)
        // Actually, let's just insert. We unique on (user_id_1, user_id_2). 
        // To be safe and simple: always store smaller ID in user_id_1
        const u1 = Math.min(senderId, receiver.id);
        const u2 = Math.max(senderId, receiver.id);

        await pool.query(
            'INSERT INTO friendships (user_id_1, user_id_2, status, action_user_id) VALUES ($1, $2, $3, $4)',
            [u1, u2, 'pending', senderId]
        );

        // Notify via Socket.io if online
        if (req.io) {
            req.io.to(`user_${receiver.id}`).emit('friend_request', {
                senderId,
                senderName: req.user.name
            });
        }

        res.json({ message: 'Friend request sent' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Accept Friend Request
router.post('/accept', auth, async (req, res) => {
    try {
        const { requestId } = req.body; // Friendship ID
        const userId = req.user.id;

        // Find friendship where validation is needed
        // For simplicity, we just look for a pending request involving this user where they are NOT the action_user
        const result = await pool.query(
            'SELECT * FROM friendships WHERE id = $1',
            [requestId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Request not found' });
        const rel = result.rows[0];

        if (rel.status !== 'pending') return res.status(400).json({ message: 'Request is handled' });
        if (rel.action_user_id === userId) return res.status(400).json({ message: 'You cannot accept your own request' });
        if (rel.user_id_1 !== userId && rel.user_id_2 !== userId) return res.status(403).json({ message: 'Not authorized' });

        await pool.query(
            'UPDATE friendships SET status = $1, action_user_id = $2, updated_at = NOW() WHERE id = $3',
            ['accepted', userId, requestId]
        );

        res.json({ message: 'Friend request accepted' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// List Friends & Requests
router.get('/friends', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all friendships
        const result = await pool.query(
            `SELECT f.*, 
                    u1.id as u1_id, u1.name as u1_name, u1.profile_pic_url as u1_pic, u1.referral_code as u1_code,
                    u2.id as u2_id, u2.name as u2_name, u2.profile_pic_url as u2_pic, u2.referral_code as u2_code
             FROM friendships f
             JOIN users u1 ON f.user_id_1 = u1.id
             JOIN users u2 ON f.user_id_2 = u2.id
             WHERE user_id_1 = $1 OR user_id_2 = $1`,
            [userId]
        );

        const friendships = result.rows.map(row => {
            const isUser1 = row.u1_id === userId;
            const friend = isUser1 ? {
                id: row.u2_id,
                name: row.u2_name,
                profile_pic_url: row.u2_pic,
                friend_code: row.u2_code
            } : {
                id: row.u1_id,
                name: row.u1_name,
                profile_pic_url: row.u1_pic,
                friend_code: row.u1_code
            };

            return {
                id: row.id,
                status: row.status,
                actionUserId: row.action_user_id,
                friend
            };
        });

        res.json({ friendships });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Messaging Logic ---

// Get Messages
router.get('/messages/:friendId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);
        const { limit = 50, offset = 0 } = req.query;

        // Validate friendship exists (optional but good practice)
        // ...

        const result = await pool.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) 
                OR (sender_id = $2 AND receiver_id = $1)
             ORDER BY created_at DESC
             LIMIT $3 OFFSET $4`,
            [userId, friendId, limit, offset]
        );

        // Mark as read (async, don't wait)
        pool.query(
            'UPDATE messages SET is_read = TRUE WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE',
            [userId, friendId]
        );

        res.json({ messages: result.rows.reverse() }); // Return chronological order

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send Message
router.post('/messages', auth, async (req, res) => {
    try {
        const { friendId, content, type = 'text' } = req.body;
        const userId = req.user.id;

        const result = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, friendId, content, type]
        );

        const message = result.rows[0];

        // Emit Socket Event
        if (req.io) {
            // Emitting to receiver's room
            req.io.to(`user_${friendId}`).emit('new_message', message);
            // Also emit to sender (for multiple devices or confirmation)
            req.io.to(`user_${userId}`).emit('message_sent', message);
        }

        res.json({ message });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
