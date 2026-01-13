// models/User.js
const pool = require('../config/database');

class User {
    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        const result = await pool.query(
            'SELECT id, name, email, role, age, sex, phone, gym, profile_pic_url, notes, created_at, subscription_status, subscription_tier FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    /**
     * Create new user
     */
    static async create(userData) {
        const { name, email, password, role, age, sex, phone, gym, notes, profilePicUrl,
            subscription_tier = 'starter', subscription_status = 'inactive' } = userData;

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, age, sex, phone, gym, notes, profile_pic_url, subscription_tier, subscription_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING id, name, email, role, age, sex, phone, gym, notes, profile_pic_url, subscription_tier, subscription_status`,
            [name, email, password, role, age, sex, phone, gym, notes, profilePicUrl, subscription_tier, subscription_status]
        );

        return result.rows[0];
    }

    /**
     * Authenticate user
     */
    static async authenticate(email, password) {
        const result = await pool.query(
            'SELECT id, name, email, role, subscription_status, status FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );
        return result.rows[0];
    }

    /**
     * Update user profile
     */
    static async updateProfile(userId, profileData) {
        const { name, age, sex, phone, gym, notes } = profileData;

        const result = await pool.query(
            `UPDATE users 
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           sex = COALESCE($3, sex),
           phone = COALESCE($4, phone),
           gym = COALESCE($5, gym),
           notes = COALESCE($6, notes)
       WHERE id = $7
       RETURNING id, name, email, role, age, sex, phone, gym, profile_pic_url, notes`,
            [name, age, sex, phone, gym, notes, userId]
        );

        return result.rows[0];
    }

    /**
     * Update profile picture
     */
    static async updateProfilePicture(userId, profilePicUrl) {
        const result = await pool.query(
            'UPDATE users SET profile_pic_url = $1 WHERE id = $2 RETURNING id, profile_pic_url',
            [profilePicUrl, userId]
        );
        return result.rows[0];
    }
}

module.exports = User;
