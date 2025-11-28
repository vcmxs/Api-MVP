const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    try {
        console.log('🚀 Running migration 003: Add workout templates tables...');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'migrations', '003_add_workout_templates.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the migration
        await pool.query(sql);

        console.log('✅ Migration completed successfully!');

        // Verify the tables exist
        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('workout_templates', 'template_exercises')
      ORDER BY table_name;
    `);

        console.log('\n📋 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        // Check indexes
        const indexesResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname IN ('idx_templates_user', 'idx_template_exercises_template')
      ORDER BY indexname;
    `);

        console.log('\n🔍 Created indexes:');
        indexesResult.rows.forEach(row => {
            console.log(`  ✓ ${row.indexname}`);
        });

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
