require('dotenv').config();
const { Pool } = require('pg');

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const config = hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

if (!hasDatabaseUrl && !config.host) {
  console.error('Database check skipped: set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in the environment.');
  process.exit(2);
}

const pool = new Pool({ ...config, connectionTimeoutMillis: 10000 });

async function checkDatabaseConnection() {
  let client;
  let connected = false;
  try {
    client = await pool.connect();
    connected = true;
    console.log('PostgreSQL connection established.');
    await client.query('SELECT 1');
    console.log('Read-only query succeeded (SELECT 1).');
  } catch (error) {
    const stage = connected ? 'Read-only query failed' : 'Database connection failed';
    console.error(`${stage}${error.code ? ` (${error.code})` : '.'}`);
    if (error.message) {
      const safeMessage = error.message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://[redacted]@');
      console.error(`Details: ${safeMessage}`);
    }
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

checkDatabaseConnection();
