// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

// Middleware to verify JWT token and extract user info
const authenticateToken = (req, res, next) => {
    const token = req.headers.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication token required'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        console.error('Auth Error:', err.message);
        console.error('Token:', token ? token.substring(0, 20) + '...' : 'null');
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid or expired token',
            details: err.message
        });
    }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    // First authenticate the token
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }
        next();
    });
};

// Middleware to check if user is coach or admin
const requireCoach = (req, res, next) => {
    // First authenticate the token
    authenticateToken(req, res, () => {
        if (req.user.role !== 'coach' && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Coach access required'
            });
        }
        next();
    });
};

// Middleware to check if coach has active subscription
const requireActiveSubscription = async (req, res, next) => {
    // First authenticate the token
    authenticateToken(req, res, async () => {
        // Only check subscription for coaches
        if (req.user.role !== 'coach') {
            return next();
        }

        try {
            const pool = require('../db');
            const result = await pool.query(
                'SELECT subscription_status, subscription_tier FROM users WHERE id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    error: 'Subscription Required',
                    message: 'User not found'
                });
            }

            const { subscription_status, subscription_tier } = result.rows[0];

            // Allow access if active OR if on starter/basic plan (which doesn't require activation)
            const isActive = subscription_status === 'active';
            const isStarter = subscription_tier === 'starter' || subscription_tier === 'basic' || !subscription_tier;

            if (!isActive && !isStarter) {
                return res.status(403).json({
                    error: 'Subscription Required',
                    message: 'Active subscription required to access this feature'
                });
            }

            next();
        } catch (err) {
            console.error('Subscription check error:', err);
            res.status(500).json({ error: 'Internal Server Error', message: err.message });
        }
    });
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireCoach,
    requireActiveSubscription
};
