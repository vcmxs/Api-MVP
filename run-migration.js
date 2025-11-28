// run-migration.js
// Script to run the exercise database migration

const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running exercise database migration...');

        // Read the SQL file
        const sqlFile = path.join(__dirname, 'migrations', '001_create_exercises_table.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('📊 Exercise library table created and populated with 177 exercises');

        // Verify the data
        const result = await client.query('SELECT COUNT(*) FROM exercise_library');
        console.log(`✓ Total exercises in database: ${result.rows[0].count}`);

        const categories = await client.query('SELECT DISTINCT muscle_category FROM exercise_library WHERE muscle_category IS NOT NULL AND muscle_category != \'\' ORDER BY muscle_category');
        console.log(`✓ Muscle categories: ${categories.rows.length}`);
        console.log('  Categories:', categories.rows.map(r => r.muscle_category).join(', '));

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
