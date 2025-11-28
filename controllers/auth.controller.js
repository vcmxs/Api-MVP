// controllers/auth.controller.js
const User = require('../models/User');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, age, sex, phone, gym, notes } = req.body;

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'All fields are required: name, email, password, role'
            });
        }

        if (role !== 'coach' && role !== 'trainee' && role !== 'admin') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Role must be "coach", "trainee", or "admin"'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Email already registered'
            });
        }

        // Handle profile picture if uploaded
        let profilePicUrl = null;
        if (req.file) {
            // Store relative path that can be accessed via /uploads/profile-pics/filename
            profilePicUrl = `/uploads/profile-pics/${req.file.filename}`;
        }

        // Create new user with profile picture
        const user = await User.create({
            name,
            email,
            password,
            role,
            age,
            sex,
            phone,
            gym,
            notes,
            profilePicUrl
        });

        // Generate token (simple implementation - use JWT in production)
        const token = `token_${user.id}_${Date.now()}`;

        res.status(201).json({
            token,
            user: {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicUrl: user.profile_pic_url
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Email and password are required'
            });
        }

        // Authenticate user
        const user = await User.authenticate(email, password);

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = `token_${user.id}_${Date.now()}`;

        res.json({
            token,
            user: {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                subscriptionStatus: user.subscription_status,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};
