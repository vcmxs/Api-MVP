const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTable() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'api_mvp',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS training_plans (
                id VARCHAR(100) PRIMARY KEY,
                coach_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                duration_weeks INT DEFAULT 4,
                is_reusable BOOLEAN DEFAULT TRUE,
                program_folder_id INT NULL,
                schedule JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (program_folder_id) REFERENCES programs(id) ON DELETE SET NULL
            )
        `);
        console.log('training_plans table created successfully');
    } catch (e) {
        console.error('Error creating table:', e);
    } finally {
        pool.end();
    }
}
createTable();
