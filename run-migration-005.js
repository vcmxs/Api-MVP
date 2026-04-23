const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running Migration 005 (Payments Ledger)...');

        // Read the SQL file
        const sqlFile = path.join(__dirname, 'migrations', '005_add_payments_ledger.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Migration 005 completed successfully!');
        console.log('📊 Tables `payments` and `payouts` have been created.');

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
