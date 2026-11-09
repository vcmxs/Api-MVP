// run-migration-009.js
//
// Applies migrations/009_exercise_dataset.sql: adds the muscle taxonomy,
// Spanish instructions and self-hosted media columns to exercise_library.
//
// Before touching the schema it snapshots the whole table into
// exercise_library_backup_20261106 so every row can be restored.
//
// Usage:  node run-migration-009.js
//
// The migration itself is additive and idempotent: re-running it is safe.

// Usage:
//   node run-migration-009.js                → DATABASE_URL (.env staging)
//   node run-migration-009.js --production   → PRODUCTION_DATABASE_URL
//                                              (requires CONFIRM_PROD_MIGRATION=YES)
//
// The migration itself is additive and idempotent: re-running it is safe.

require('dotenv').config({ quiet: true });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_TABLE = 'exercise_library_backup_20261106';
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

async function tableExists(client, name) {
    const result = await client.query('SELECT to_regclass($1) AS oid', [`public.${name}`]);
    return result.rows[0].oid !== null;
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
        console.log('🔄 Running Migration 009 (Exercise dataset enrichment)...');
        console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);

        const columnsBefore = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'exercise_library'
        `);
        const before = new Set(columnsBefore.rows.map(row => row.column_name));

        // ── 1. Snapshot ────────────────────────────────────────────────────
        if (await tableExists(client, BACKUP_TABLE)) {
            const count = await client.query(`SELECT COUNT(*) FROM ${BACKUP_TABLE}`);
            console.log(`ℹ️  Backup ${BACKUP_TABLE} already exists (${count.rows[0].count} rows) — keeping it.`);
        } else {
            await client.query(`CREATE TABLE ${BACKUP_TABLE} AS SELECT * FROM exercise_library`);
            const count = await client.query(`SELECT COUNT(*) FROM ${BACKUP_TABLE}`);
            console.log(`💾 Backup created: ${BACKUP_TABLE} (${count.rows[0].count} rows)`);
        }

        // ── 2. Migration ───────────────────────────────────────────────────
        const sqlFile = path.join(__dirname, 'migrations', '009_exercise_dataset.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        await client.query(sql);

        // ── 3. Verification ────────────────────────────────────────────────
        const columnsAfter = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'exercise_library'
        `);
        const added = columnsAfter.rows
            .map(row => row.column_name)
            .filter(name => !before.has(name));

        const total = await client.query('SELECT COUNT(*) FROM exercise_library');
        const normalized = await client.query('SELECT COUNT(*) FROM exercise_library WHERE name_norm IS NOT NULL');

        console.log('✅ Migration 009 completed successfully!');
        console.log(`📊 Columns added (${added.length}): ${added.join(', ') || 'none (already applied)'}`);
        console.log(`📚 exercise_library: ${total.rows[0].count} rows, ${normalized.rows[0].count} with name_norm`);
        console.log(`💾 Rollback available: DELETE FROM exercise_library; INSERT INTO exercise_library SELECT * FROM ${BACKUP_TABLE};`);

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
