require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Schema inspection requires DATABASE_URL.');
  process.exit(2);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function inspectSchema() {
  try {
    const result = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const tables = new Map();
    for (const row of result.rows) {
      if (!tables.has(row.table_name)) tables.set(row.table_name, []);
      tables.get(row.table_name).push(row);
    }

    console.log(`Read-only schema inventory: ${tables.size} tables`);
    for (const [tableName, columns] of tables) {
      console.log(`\n${tableName}`);
      for (const column of columns) {
        const nullable = column.is_nullable === 'YES' ? 'nullable' : 'not null';
        const defaultValue = column.column_default ? `; default: ${column.column_default}` : '';
        console.log(`  ${column.column_name}: ${column.data_type} (${nullable}${defaultValue})`);
      }
    }
  } catch (error) {
    console.error(`Schema inspection failed${error.code ? ` (${error.code})` : '.'}`);
    const safeMessage = error.message?.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://[redacted]@');
    if (safeMessage) console.error(`Details: ${safeMessage}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

inspectSchema();
