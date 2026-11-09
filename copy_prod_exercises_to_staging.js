// copy_prod_exercises_to_staging.js
//
// Copies the production exercise catalog (exercise_library) into the test/staging
// database configured through DATABASE_URL.
//
// Safety rules:
//   - PRODUCTION_DATABASE_URL is only ever read (SELECT).
//   - Every write targets DATABASE_URL and happens inside a single transaction.
//   - Nothing is written unless DRY_RUN=YES (report only) or CONFIRM_EXERCISE_COPY=YES.
//   - db.js is intentionally not imported: importing it would create tables and seed
//     demo users/exercises into the target database.
//
// Usage (cmd.exe from the repository root):
//   set DRY_RUN=YES && npm run db:copy-exercises-to-staging
//   set CONFIRM_EXERCISE_COPY=YES && npm run db:copy-exercises-to-staging
//   set MODE=upsert && set CONFIRM_EXERCISE_COPY=YES && npm run db:copy-exercises-to-staging
//
// PowerShell equivalent: $env:DRY_RUN='YES'; npm run db:copy-exercises-to-staging
//
// Modes:
//   mirror (default) - empties the target catalog and copies production rows with the
//                      same ids, then realigns the id sequence.
//   upsert           - inserts missing rows and updates existing ones by name; never
//                      deletes and lets the target assign ids.

require('dotenv').config();
const { Pool } = require('pg');

const TABLE = 'exercise_library';
const INSERT_CHUNK_SIZE = 50;
const SUPPORTED_MODES = ['mirror', 'upsert'];

function parseDatabaseUrl(value, label) {
  if (!value) throw new Error(`${label} is not configured in the local environment.`);

  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${label} must use a PostgreSQL URL.`);
  }

  return {
    hostname: url.hostname,
    port: url.port || '5432',
    username: decodeURIComponent(url.username),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
  };
}

function sanitize(message) {
  return String(message || '')
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://[redacted]@')
    .trim();
}

function createPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 2,
  });
}

function quoteIdentifier(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Unexpected identifier: ${name}`);
  }
  return `"${name}"`;
}

async function readColumns(pool, label) {
  const result = await pool.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [TABLE]
  );
  if (result.rows.length === 0) {
    throw new Error(`${TABLE} does not exist in ${label}. Run the guarded schema copy first (npm run db:copy-schema-to-staging).`);
  }
  return result.rows.map((row) => row.column_name);
}

async function countRows(pool) {
  const result = await pool.query(`SELECT COUNT(*)::int AS row_count FROM ${quoteIdentifier(TABLE)}`);
  return result.rows[0].row_count;
}

async function readSourceRows(pool, columns, orderColumn) {
  const projection = columns.map(quoteIdentifier).join(', ');
  const result = await pool.query(
    `SELECT ${projection} FROM ${quoteIdentifier(TABLE)} ORDER BY ${quoteIdentifier(orderColumn)}`
  );
  return result.rows;
}

async function hasUniqueNameIndex(pool) {
  const result = await pool.query(
    `SELECT pg_get_indexdef(i.indexrelid) AS definition
       FROM pg_index i
       JOIN pg_class t ON t.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = $1 AND i.indisunique`,
    [TABLE]
  );
  return result.rows.some((row) => /\(\s*name\s*\)/i.test(row.definition || ''));
}

function describeVideoUrls(rows) {
  const stats = { valid: 0, placeholder: 0, empty: 0 };
  for (const row of rows) {
    const value = typeof row.video_url === 'string' ? row.video_url.trim() : '';
    if (!value) stats.empty += 1;
    else if (/^https?:\/\/\S+$/i.test(value)) stats.valid += 1;
    else stats.placeholder += 1;
  }
  return stats;
}

async function insertRows(client, columns, rows, conflictColumns) {
  const columnList = columns.map(quoteIdentifier).join(', ');
  const updateList = columns
    .filter((column) => !conflictColumns || !conflictColumns.includes(column))
    .filter((column) => column !== 'id')
    .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`);
  const conflictClause = conflictColumns
    ? ` ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO UPDATE SET ${updateList.join(', ')}`
    : '';

  let written = 0;
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
    const values = [];
    const tuples = chunk.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const result = await client.query(
      `INSERT INTO ${quoteIdentifier(TABLE)} (${columnList}) VALUES ${tuples.join(', ')}${conflictClause}`,
      values
    );
    written += result.rowCount;
  }
  return written;
}

async function main() {
  const mode = (process.env.MODE || 'mirror').toLowerCase();
  if (!SUPPORTED_MODES.includes(mode)) {
    throw new Error(`MODE must be one of: ${SUPPORTED_MODES.join(', ')}.`);
  }

  const dryRun = process.env.DRY_RUN === 'YES';
  if (!dryRun && process.env.CONFIRM_EXERCISE_COPY !== 'YES') {
    throw new Error('Not run: set DRY_RUN=YES for a read-only report or CONFIRM_EXERCISE_COPY=YES to write to DATABASE_URL.');
  }

  const source = parseDatabaseUrl(process.env.PRODUCTION_DATABASE_URL, 'PRODUCTION_DATABASE_URL');
  const target = parseDatabaseUrl(process.env.DATABASE_URL, 'DATABASE_URL (staging target)');
  if (source.hostname === target.hostname && source.port === target.port && source.database === target.database) {
    throw new Error('Source and target appear to be the same database; refusing to continue.');
  }

  console.log(`Source (read-only): ${source.hostname}:${source.port}/${source.database}`);
  console.log(`Target (write):     ${target.hostname}:${target.port}/${target.database}`);
  console.log(`Mode:               ${mode}${dryRun ? ' (dry run, nothing written)' : ''}`);

  const sourcePool = createPool(process.env.PRODUCTION_DATABASE_URL);
  const targetPool = createPool(process.env.DATABASE_URL);

  try {
    const sourceColumns = await readColumns(sourcePool, 'the production database');
    const targetColumns = await readColumns(targetPool, 'the target database');

    const sharedColumns = sourceColumns.filter((column) => targetColumns.includes(column));
    const sourceOnlyColumns = sourceColumns.filter((column) => !targetColumns.includes(column));
    if (sourceOnlyColumns.length > 0) {
      console.warn(`Skipping production-only columns that are missing in the target: ${sourceOnlyColumns.join(', ')}`);
    }
    if (!sharedColumns.includes('name')) {
      throw new Error('The target table has no name column; refusing to continue.');
    }

    const orderColumn = sharedColumns.includes('id') ? 'id' : 'name';
    const rows = await readSourceRows(sourcePool, sharedColumns, orderColumn);
    const targetCountBefore = await countRows(targetPool);

    console.log(`\nColumns copied:     ${sharedColumns.join(', ')}`);
    console.log(`Production rows:    ${rows.length}`);
    console.log(`Target rows before: ${targetCountBefore}`);

    if (sharedColumns.includes('video_url')) {
      const videoStats = describeVideoUrls(rows);
      console.log(
        `Production video_url: ${videoStats.valid} http(s) URLs, ${videoStats.placeholder} placeholders, ${videoStats.empty} empty`
      );
    }

    if (rows.length === 0) {
      throw new Error('The production catalog is empty; nothing to copy.');
    }

    if (mode === 'upsert' && !(await hasUniqueNameIndex(targetPool))) {
      throw new Error('The target table has no unique index on name; use MODE=mirror instead.');
    }

    if (dryRun) {
      console.log(
        mode === 'mirror'
          ? `\nDry run: MODE=mirror would delete ${targetCountBefore} target row(s) and insert ${rows.length} production row(s).`
          : `\nDry run: MODE=upsert would insert or update up to ${rows.length} row(s) by name.`
      );
      return;
    }

    const client = await targetPool.connect();
    let written = 0;
    try {
      await client.query('BEGIN');

      if (mode === 'mirror') {
        const deleted = await client.query(`DELETE FROM ${quoteIdentifier(TABLE)}`);
        console.log(`\nTarget rows deleted: ${deleted.rowCount}`);
        written = await insertRows(client, sharedColumns, rows, null);
        if (sharedColumns.includes('id')) {
          await client.query(
            `SELECT setval(
               pg_get_serial_sequence($1, 'id'),
               GREATEST(COALESCE((SELECT MAX(id) FROM ${quoteIdentifier(TABLE)}), 1), 1)
             )`,
            [TABLE]
          );
        }
      } else {
        const insertColumns = sharedColumns.filter((column) => column !== 'id');
        written = await insertRows(client, insertColumns, rows, ['name']);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }

    const targetCountAfter = await countRows(targetPool);
    console.log(`Rows written:       ${written}`);
    console.log(`Target rows after:  ${targetCountAfter}`);
    console.log('\nProduction exercise catalog copied to the target database.');
  } finally {
    await sourcePool.end().catch(() => {});
    await targetPool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`Exercise catalog copy stopped: ${sanitize(error.message)}`);
  process.exitCode = 1;
});

