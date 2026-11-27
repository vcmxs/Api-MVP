// run-migration-016.js
//
// Applies migrations/016_exercise_translations.sql:
//
//   exercise_translations          → ES/EN names + instructions per catalog row
//   exercise_translation_history   → append-only audit trail for edits
//   exercise_translation_candidates→ dataset rows that have no catalog id
//   exercises.exercise_library_id  → optional link (ON DELETE SET NULL)
//
// The migration is additive and idempotent; it never renames, renumbers or
// deletes an `exercise_library` or `exercises` row.
//
// Usage:
//   node run-migration-016.js                → DATABASE_URL (.env staging)
//   node run-migration-016.js --dry-run      → runs the DDL and rolls it back
//   node run-migration-016.js --production   → PRODUCTION_DATABASE_URL
//                                              (requires CONFIRM_PROD_MIGRATION=YES)
//
// After applying it:
//   node scripts/import-exercise-translations.js --apply
//   node scripts/backfill-exercise-library-links.js --apply

require('dotenv').config({ quiet: true });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const useProduction = process.argv.includes('--production');
const dryRun = process.argv.includes('--dry-run');

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

async function inspect(client) {
    const result = await client.query(`
        SELECT
          to_regclass('public.exercise_translations') IS NOT NULL AS translations,
          to_regclass('public.exercise_translation_history') IS NOT NULL AS history,
          to_regclass('public.exercise_translation_candidates') IS NOT NULL AS candidates,
          EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'exercises'
               AND column_name = 'exercise_library_id'
          ) AS exercises_link,
          EXISTS (
            SELECT 1
              FROM pg_proc p
              JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public'
               AND p.proname = 'exercise_normalize_name'
          ) AS normalize_fn
    `);
    return result.rows[0];
}

function formatInspect(row) {
    const flag = value => (value ? '✅' : '—');
    return [
        `${flag(row.translations)} exercise_translations`,
        `${flag(row.history)} audit`,
        `${flag(row.candidates)} candidates`,
        `${flag(row.exercises_link)} exercises.exercise_library_id`,
        `${flag(row.normalize_fn)} exercise_normalize_name()`,
    ].join(' · ');
}

async function runMigration() {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
        console.error('❌ No database connection string available for this target.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 15000,
    });

    let client;
    try {
        try {
            client = await pool.connect();
        } catch (err) {
            console.error(`❌ Could not connect to ${describeTarget(connectionString)}: ${err.message}`);
            console.error('ℹ️  Railway staging sleeps when idle — wake it, or run with --production.');
            process.exitCode = 1;
            return;
        }

        await migrate(client, connectionString);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

async function migrate(client, connectionString) {
    console.log('🔄 Running Migration 016 (localised exercise names + catalog link)...');
    console.log(`🎯 Target: ${describeTarget(connectionString)}${useProduction ? '  ⚠️  PRODUCTION' : '  (staging)'}`);
    if (dryRun) console.log('🧪 Dry run: the DDL will be rolled back.');

    const before = await inspect(client);
    console.log(`📊 Before: ${formatInspect(before)}`);

    await client.query('BEGIN');

    try {
        const sqlFile = path.join(__dirname, 'migrations', '016_exercise_translations.sql');
        await client.query(fs.readFileSync(sqlFile, 'utf8'));

        const after = await inspect(client);
        console.log(`📊 After:  ${formatInspect(after)}`);

        if (dryRun) {
            await client.query('ROLLBACK');
            console.log('🧪 Dry run: migration 016 rolled back.');
            return;
        }

        await client.query('COMMIT');
        console.log('✅ Migration 016 completed.');
        console.log('👉 Next: node scripts/import-exercise-translations.js --dry-run');
        console.log('👉 Then: node scripts/import-exercise-translations.js --apply');
        console.log('👉 Then: node scripts/backfill-exercise-library-links.js --dry-run');
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    }
}

runMigration();
