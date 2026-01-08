// controllers/user.controller.js
const User = require('../models/User');
const pool = require('../config/database');

/**
 * Get user details
 */
exports.getUserById = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, subscription_status, subscription_tier FROM users WHERE id = $1',
            [req.params.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get coach's trainees
 */
exports.getCoachTrainees = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, ct.assigned_at
       FROM users u
       INNER JOIN coach_trainee ct ON u.id = ct.trainee_id
       WHERE ct.coach_id = $1 AND u.role = 'trainee'
       ORDER BY u.name`,
            [req.params.coachId]
        );

        res.json({ trainees: result.rows });
    } catch (err) {
        console.error('Get trainees error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Assign trainee to coach
 */
exports.assignTrainee = async (req, res) => {
    const { coachId } = req.params;
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Email is required'
        });
    }

    try {
        // Find trainee by email
        const trainee = await User.findByEmail(email);

        if (!trainee) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'No user found with that email'
            });
        }

        if (trainee.role !== 'trainee') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User is not a trainee'
            });
        }

        // Check if trainee is already assigned to ANY coach
        const existingResult = await pool.query(
            'SELECT id FROM coach_trainee WHERE trainee_id = $1',
            [trainee.id]
        );

        if (existingResult.rows.length > 0) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'This trainee is already assigned to a coach. They must leave their current coach before you can add them.'
            });
        }

        // Assign trainee to coach
        await pool.query(
            'INSERT INTO coach_trainee (coach_id, trainee_id) VALUES ($1, $2)',
            [coachId, trainee.id]
        );

        res.status(201).json({
            id: trainee.id,
            name: trainee.name,
            email: trainee.email
        });
    } catch (err) {
        console.error('Assign trainee error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Get user profile
 */
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        // If user is a trainee, fetch assigned coach
        if (user.role === 'trainee') {
            const coachResult = await pool.query(
                `SELECT u.name as coach_name 
                 FROM users u 
                 INNER JOIN coach_trainee ct ON u.id = ct.coach_id 
                 WHERE ct.trainee_id = $1`,
                [req.params.userId]
            );

            if (coachResult.rows.length > 0) {
                user.assigned_coach = coachResult.rows[0].coach_name;
            }
        }

        res.json(user);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (req, res) => {
    const { userId } = req.params;
    const { name, age, sex, phone, gym, notes } = req.body;

    try {
        const user = await User.updateProfile(userId, { name, age, sex, phone, gym, notes });

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * Update profile picture
 */
exports.updateProfilePicture = async (req, res) => {
    const { userId } = req.params;

    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({ error: 'Bad Request', message: 'No image file uploaded' });
    }

    try {
        // Create the URL path for the uploaded file
        const profilePicUrl = `/uploads/profile-pics/${req.file.filename}`;

        const user = await User.updateProfilePicture(userId, profilePicUrl);

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Update profile picture error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};


/**
 * Remove coach-trainee connection
 */
exports.removeConnection = async (req, res) => {
    const { userId } = req.params; // The user initiating the removal
    const { targetId } = req.body; // The other user to disconnect from

    try {
        // We need to know who is who.
        // If userId is coach, targetId is trainee.
        // If userId is trainee, targetId is coach (or implied if they only have one).

        // Perform deletion matching either combination
        const result = await pool.query(
            `DELETE FROM coach_trainee 
             WHERE (coach_id = $1 AND trainee_id = $2) 
                OR (coach_id = $2 AND trainee_id = $1)
             RETURNING id`,
            [userId, targetId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Connection not found' });
        }

        res.json({ message: 'Connection removed successfully' });
    } catch (err) {
        console.error('Remove connection error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};
