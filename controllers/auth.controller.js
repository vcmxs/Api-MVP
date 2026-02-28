// controllers/auth.controller.js
const User = require('../models/User');
const pool = require('../config/database');
const { sendVerificationEmail } = require('../utils/emailService');

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

        // Generate 6-digit confirmation PIN
        const verification_pin = Math.floor(100000 + Math.random() * 900000).toString();

        // Expiration time: 15 minutes from now
        const pin_expires_at = new Date(Date.now() + 15 * 60 * 1000);

        // Create new user with profile picture and PIN
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
            referredBy,
            verification_pin,
            pin_expires_at
        });

        // Send the verification email using Nodemailer
        try {
            await sendVerificationEmail(email, verification_pin);
        } catch (emailError) {
            console.error("Failed to send verification email but user was created:", emailError);
            // We proceed anyway, they can request a new PIN using "Resend" later.
        }

        // IMPORTANT: We NO LONGER return a JWT token upon registration. 
        // The user must verify the email before they get a token.
        res.status(201).json({
            message: 'User registered successfully. Please verify your email.',
            requiresVerification: true,
            user: {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified
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

        // First check if user exists by email, fallback to username
        let userAccount = await User.findByEmail(cleanEmail);
        if (!userAccount) {
            userAccount = await User.findByUsername(cleanEmail);
        }

        if (!userAccount) {
            console.log('User NOT found by email or username');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found with this email or username'
            });
        }

        // Check password (direct comparison for now as per current DB setup)
        if (userAccount.password !== cleanPassword) {
            console.log(`Password mismatch. Input: '${cleanPassword}', Stored: '${userAccount.password}'`);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Incorrect password'
            });
        }

        // Check if the user's email is verified
        if (userAccount.is_verified === false) {
            console.log(`User ${userAccount.email} attempted to log in without email verification.`);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Please verify your email address to continue.',
                needsVerification: true,
                email: userAccount.email
            });
        }

        // Check for subscription expiration
        if (userAccount.subscription_status === 'active' && userAccount.subscription_end_date) {
            const endDate = new Date(userAccount.subscription_end_date);
            if (endDate < new Date()) {
                console.log(`Subscription expired for user ${userAccount.id}. Downgrading to free/starter.`);
                // Downgrade user
                await pool.query(
                    "UPDATE users SET subscription_status = 'free', subscription_tier = 'starter' WHERE id = $1",
                    [userAccount.id]
                );
                // Update local object so response is correct
                userAccount.subscription_status = 'free';
                userAccount.subscription_tier = 'starter';
            }
        }

        const user = userAccount;
        console.log('User authenticated successfully');

        // Check for Coach Subscription if Trainee
        let coachSubscription = null;
        let coachId = null;
        if (user.role === 'trainee') {
            try {
                const coachSubResult = await pool.query(
                    `SELECT subscription_status, subscription_end_date, coach_id 
                     FROM coach_trainee 
                     WHERE trainee_id = $1 
                     ORDER BY subscription_end_date DESC 
                     LIMIT 1`,
                    [user.id]
                );
                if (coachSubResult.rows.length > 0) {
                    coachSubscription = coachSubResult.rows[0];
                    coachId = coachSubResult.rows[0].coach_id;
                }
            } catch (err) {
                console.error('Error fetching coach subscription:', err);
            }
        }

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
            { expiresIn: '365d' } // Token expires in 365 days (1 year)
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
                coachSubscriptionStatus: coachSubscription ? coachSubscription.subscription_status : null,
                coachSubscriptionEndDate: coachSubscription ? coachSubscription.subscription_end_date : null,
                coachId: coachId,
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
            { expiresIn: '365d' } // Token expires in 365 days (1 year)
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
                status: user.status,
                referredBy: user.referred_by,
                referralCode: user.referral_code,
                referralDiscountUsed: user.referral_discount_used
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
/**
 * Verify a user's email using the 6-digit PIN
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { email, pin } = req.body;

        if (!email || !pin) {
            return res.status(400).json({ error: 'Bad Request', message: 'Email and PIN are required' });
        }

        const user = await User.findByEmail(email.trim().toLowerCase());
        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: 'Bad Request', message: 'Email is already verified' });
        }

        // Check PIN validity
        if (user.verification_pin !== pin) {
            return res.status(400).json({ error: 'Bad Request', message: 'Invalid verification PIN' });
        }

        // Check expiration
        if (new Date(user.pin_expires_at) < new Date()) {
            return res.status(400).json({ error: 'Bad Request', message: 'Verification PIN has expired' });
        }

        // Mark as verified and clear PIN
        await pool.query(
            "UPDATE users SET is_verified = TRUE, verification_pin = NULL, pin_expires_at = NULL WHERE id = $1",
            [user.id]
        );

        res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (err) {
        console.error('Email verification error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Resend Verification PIN
 */
exports.resendPin = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Bad Request', message: 'Email is required' });

        const user = await User.findByEmail(email.trim().toLowerCase());
        if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        if (user.is_verified) return res.status(400).json({ error: 'Bad Request', message: 'Email is already verified' });

        // Generate new PIN
        const verification_pin = Math.floor(100000 + Math.random() * 900000).toString();
        const pin_expires_at = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            "UPDATE users SET verification_pin = $1, pin_expires_at = $2 WHERE id = $3",
            [verification_pin, pin_expires_at, user.id]
        );

        await require('../utils/emailService').sendVerificationEmail(email, verification_pin);

        res.json({ message: 'A new verification PIN has been sent.' });
    } catch (err) {
        console.error('Resend PIN error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Request Password Reset (Generates PIN)
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Bad Request', message: 'Email is required' });

        const user = await User.findByEmail(email.trim().toLowerCase());
        if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });

        // We allow reset even if not strictly verified (up to business logic)

        const reset_pin = Math.floor(100000 + Math.random() * 900000).toString();
        const pin_expires_at = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            "UPDATE users SET reset_pin = $1, pin_expires_at = $2 WHERE id = $3",
            [reset_pin, pin_expires_at, user.id]
        );

        await require('../utils/emailService').sendPasswordResetEmail(user.email, reset_pin);

        res.json({ message: 'Password reset PIN sent to email.' });
    } catch (err) {
        console.error('Forgot Password error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Execute Password Reset with PIN
 */
exports.resetPassword = async (req, res) => {
    try {
        const { email, pin, newPassword } = req.body;
        if (!email || !pin || !newPassword) return res.status(400).json({ error: 'Bad Request', message: 'All fields are required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Bad Request', message: 'Password must be at least 6 characters' });

        const user = await User.findByEmail(email.trim().toLowerCase());
        if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });

        if (user.reset_pin !== pin) return res.status(400).json({ error: 'Bad Request', message: 'Invalid reset PIN' });
        if (new Date(user.pin_expires_at) < new Date()) return res.status(400).json({ error: 'Bad Request', message: 'Reset PIN has expired' });

        // Update password and clear reset PIN
        await pool.query(
            "UPDATE users SET password = $1, reset_pin = NULL, pin_expires_at = NULL WHERE id = $2",
            [newPassword, user.id]
        );

        res.json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset Password error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
