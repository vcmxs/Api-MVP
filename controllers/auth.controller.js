// controllers/auth.controller.js
const User = require('../models/User');
const pool = require('../config/database');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, age, sex, phone, gym, notes, height, weight } = req.body;

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

        // Handle referral code
        let referredBy = null;
        if (req.body.referralCode) {
            const referrer = await User.findByReferralCode(req.body.referralCode);
            if (referrer) {
                referredBy = referrer.id;
                console.log(`User registering with referral code: ${req.body.referralCode} (Referrer ID: ${referrer.id})`);
            } else {
                console.log(`Invalid referral code provided: ${req.body.referralCode}`);
                // We could return an error, but usually it's better to just ignore invalid codes to not block registration
                // Or we can return a specific warning. For now, we'll ignore it.
            }
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
            height,
            weight,
            profilePicUrl,
            referredBy
        });

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' } // Token expires in 7 days
        );

        res.status(201).json({
            token,
            user: {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicUrl: user.profile_pic_url,
                referredBy: user.referred_by,
                referralCode: user.referral_code,
                referralDiscountUsed: false // New users haven't used it yet
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

        // Clean inputs
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        // Authenticate user
        console.log(`Login attempt for: '${cleanEmail}'`);

        // First check if user exists by email (for debugging)
        const userByEmail = await User.findByEmail(cleanEmail);
        if (!userByEmail) {
            console.log('User NOT found by email');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found with this email'
            });
        }

        // Check password (direct comparison for now as per current DB setup)
        if (userByEmail.password !== cleanPassword) {
            console.log(`Password mismatch. Input: '${cleanPassword}', Stored: '${userByEmail.password}'`);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Incorrect password'
            });
        }

        // Check for subscription expiration
        if (userByEmail.subscription_status === 'active' && userByEmail.subscription_end_date) {
            const endDate = new Date(userByEmail.subscription_end_date);
            if (endDate < new Date()) {
                console.log(`Subscription expired for user ${userByEmail.id}. Downgrading to free/starter.`);
                // Downgrade user
                await pool.query(
                    "UPDATE users SET subscription_status = 'free', subscription_tier = 'starter' WHERE id = $1",
                    [userByEmail.id]
                );
                // Update local object so response is correct
                userByEmail.subscription_status = 'free';
                userByEmail.subscription_tier = 'starter';
            }
        }

        const user = userByEmail;
        console.log('User authenticated successfully');

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

        console.log('Generating token...');
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' } // Token expires in 7 days
        );
        console.log('Token generated successfully');

        const responseData = {
            token,
            user: {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                subscriptionStatus: user.subscription_status,
                subscriptionTier: user.subscription_tier,
                status: user.status,
                referredBy: user.referred_by,
                referralCode: user.referral_code,
                referralDiscountUsed: user.referral_discount_used
            }
        };
        console.log('Sending response:', JSON.stringify(responseData));

        res.json(responseData);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};

/**
 * Google Sign-In - verify token and auto-login/register
 */
exports.googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Google ID token is required'
            });
        }

        // Verify Google token
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
        } catch (error) {
            console.error('Google token verification failed:', error);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid Google token'
            });
        }

        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name || email.split('@')[0];
        const googleId = payload.sub;

        console.log('Google Sign-In:', { email, name, googleId });

        // Check if user already exists
        let user = await User.findByEmail(email);

        if (!user) {
            // New user - auto-register with Google account
            console.log('Creating new user from Google Sign-In');
            user = await User.create({
                name: name,
                email: email,
                password: `google_${googleId}_${Math.random().toString(36)}`, // Random password (user won't use it)
                role: 'trainee', // Default role for Google sign-ups
                age: null,
                sex: null,
                phone: null,
                gym: null,
                notes: 'Registered via Google Sign-In',
                height: null,
                weight: null,
                profilePicUrl: payload.picture || null
            });
        } else {
            console.log('Existing user logging in via Google');
        }

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                subscriptionStatus: user.subscription_status,
                subscriptionTier: user.subscription_tier,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
};
