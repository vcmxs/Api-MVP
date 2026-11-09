// run-migration-010.js
//
// Applies migrations/010_caminadora_escaladora.sql, the cardio label repair:
//
//   • CAMINADORA (catalog id 142) stops borrowing dataset 2311 "walking on
//     stepmill" and is re-pointed at dataset 3666 "walking on incline
//     treadmill".
//   • ESCALADORA is created from dataset 2311 (GIF, thumbnail, Spanish
//     instructions) so the stair-climber has its own catalog row.
//
// Usage:
//   node run-migration-010.js                → DATABASE_URL (.env staging)
//   node run-migration-010.js --production   → PRODUCTION_DATABASE_URL
//                                              (requires CONFIRM_PROD_MIGRATION=YES)
//
// The migration is additive and idempotent: re-running it is safe.

require('dotenv').config({ quiet: true });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const useProduction = process.argv.includes('--production');

function describeTarget(connectionString) {
    if (!connectionString) return 'not set';
    try {
        const parsed = new URL(connectionString);
        return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
    } catch {
        return 'unparseable connection string';
    }
}

function resolveConnectionString() {
    if (!useProduction) {
        return process.env.DATABASE_URL || '';
    }

    if (String(process.env.CONFIRM_PROD_MIGRATION || '').toUpperCase() !== 'YES') {
        console.error('❌ --production requires CONFIRM_PROD_MIGRATION=YES in the environment.');
        process.exit(1);
    }

    return process.env.PRODUCTION_DATABASE_URL || '';
}

async function fetchCardioRows(client) {
    const result = await client.query(`
        SELECT id, name, name_norm, source, dataset_id, gif_file, thumb_file
          FROM exercise_library
         WHERE name_norm IN ('caminadora', 'escaladora')
         ORDER BY name_norm, id
    `);
    return result.rows;
}

async function runMigration() {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
        console.error('❌ No database connection string available for this target.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log('🔄 Running Migration 010 (CAMINADORA / ESCALADORA labels)...');
        console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);

        const before = await fetchCardioRows(client);
        console.log('📋 Before:', before.map(row => `${row.id}:${row.name_norm}→${row.dataset_id || 'null'}`).join(', ') || 'no cardio rows');

        const sqlFile = path.join(__dirname, 'migrations', '010_caminadora_escaladora.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        await client.query(sql);

        const after = await fetchCardioRows(client);
        console.log('📋 After: ', after.map(row => `${row.id}:${row.name_norm}→${row.dataset_id || 'null'}`).join(', ') || 'no cardio rows');

        const caminadora = after.find(row => row.name_norm === 'caminadora');
        const escaladora = after.find(row => row.name_norm === 'escaladora');

        console.log('✅ Migration 010 completed successfully!');
        console.log(`🚶 CAMINADORA: dataset ${caminadora?.dataset_id || 'missing'} · gif ${caminadora?.gif_file || 'none'}`);
        if (escaladora) {
            console.log(`🪜 ESCALADORA: dataset ${escaladora.dataset_id} · gif ${escaladora.gif_file || 'none'}`);
        } else {
            console.log('⚠️  ESCALADORA was not created — check that dataset 2311 is present in exercise_library.');
        }
        console.log('ℹ️  Restart the API so /exercises and /exercises/lookup serve the new rows.');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
