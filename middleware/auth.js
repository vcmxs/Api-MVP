// Middleware for role-based access control

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    // Headers are automatically lowercased by Express
    const userRole = req.headers.userrole || req.headers.userRole;

    if (userRole !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
        });
    }

    next();
};

// Middleware to check if user is coach or admin
const requireCoach = (req, res, next) => {
    const userRole = req.headers.userrole || req.headers.userRole;

    if (userRole !== 'coach' && userRole !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Coach access required'
        });
    }

    next();
};

module.exports = { requireAdmin, requireCoach };

// Middleware to check if coach has active subscription
const requireActiveSubscription = async (req, res, next) => {
    const userId = req.headers.userid || req.headers.userId;
    const userRole = req.headers.userrole || req.headers.userRole;

    // Only check subscription for coaches
    if (userRole !== 'coach') {
        return next();
    }

    try {
        const pool = require('../db');
        const result = await pool.query(
            'SELECT subscription_status FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0 || result.rows[0].subscription_status !== 'active') {
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
};

// Don't forget to export it
module.exports = { requireAdmin, requireCoach, requireActiveSubscription };
