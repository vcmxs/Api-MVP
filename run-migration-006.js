const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running Migration 006 (Comped Flag)...');

        // Read the SQL file
        const sqlFile = path.join(__dirname, 'migrations', '006_add_comped_flag.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Migration 006 completed successfully!');
        console.log('📊 Column `is_comped` added to users table.');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
