// run-migration-014.js
//
// Applies migrations/014_release_notes.sql: the `release_notes` table behind
// Settings → What's new and the `release_note` notifications it fans out.
//
// Usage:
//   node run-migration-014.js                → DATABASE_URL (.env staging)
//   node run-migration-014.js --production   → PRODUCTION_DATABASE_URL
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

async function describeTable(client) {
    const result = await client.query(`
        SELECT data_type
          FROM information_schema.columns
         WHERE table_name = 'release_notes'
           AND column_name = 'version'
    `);
    const indexes = await client.query(`
        SELECT indexname
          FROM pg_indexes
         WHERE tablename = 'release_notes'
           AND indexname = 'idx_release_notes_published'
    `);
    return {
        hasTable: result.rows.length > 0,
        hasIndex: indexes.rows.length > 0,
    };
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
        console.log('🔄 Running Migration 014 (release notes)...');
        console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);

        const sqlFile = path.join(__dirname, 'migrations', '014_release_notes.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        const { hasTable, hasIndex } = await describeTable(client);

        console.log('✅ Migration 014 completed successfully!');
        console.log(`🧭 release_notes table: ${hasTable ? 'OK' : 'MISSING'}`);
        console.log(`🧭 idx_release_notes_published: ${hasIndex ? 'OK' : 'MISSING'}`);
        console.log('ℹ️  Publish notes from the admin panel (Admin → Release notes).');

        if (!hasTable || !hasIndex) {
            console.error('⚠️  Expected the release_notes table and its published index.');
            process.exitCode = 1;
        }

    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
