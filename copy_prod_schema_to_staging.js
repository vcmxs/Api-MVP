require('dotenv').config();
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Pool } = require('pg');

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
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
  };
}

function findTool(name, configuredPath) {
  const executableName = process.platform === 'win32' ? `${name}.exe` : name;
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const candidates = [
    configuredPath,
    ...(configuredPath ? [path.join(path.dirname(configuredPath), executableName)] : []),
    ...pathEntries.map((entry) => path.join(entry, executableName)),
    ...Array.from({ length: 30 }, (_, index) => 30 - index).flatMap((major) => [
      path.join('C:\\Program Files\\PostgreSQL', String(major), 'pgAdmin 4', 'runtime', `${name}.exe`),
      path.join('C:\\Program Files\\PostgreSQL', String(major), 'bin', `${name}.exe`),
    ]),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`${name} was not found. Install PostgreSQL command-line tools or set ${name.toUpperCase()}_PATH.`);
}

function runTool(command, args, env, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const sanitized = stderr.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://[redacted]@').trim();
      reject(new Error(`${path.basename(command)} exited with code ${code}${sanitized ? `: ${sanitized}` : '.'}`));
    });

    if (options.stdinFile) {
      const input = fs.createReadStream(options.stdinFile);
      input.on('error', reject);
      input.pipe(child.stdin);
    }
  });
}

async function copySchema() {
  if (process.env.CONFIRM_STAGING_SCHEMA_COPY !== 'YES') {
    throw new Error('Not run: set CONFIRM_STAGING_SCHEMA_COPY=YES only after verifying DATABASE_URL targets the empty staging database.');
  }

  const source = parseDatabaseUrl(process.env.PRODUCTION_DATABASE_URL, 'PRODUCTION_DATABASE_URL');
  const target = parseDatabaseUrl(process.env.DATABASE_URL, 'DATABASE_URL (staging target)');
  if (source.hostname === target.hostname && source.port === target.port && source.database === target.database) {
    throw new Error('Source and target appear to be the same database; refusing to continue.');
  }

  const pgDump = findTool('pg_dump', process.env.PG_DUMP_PATH);
  const psql = findTool('psql', process.env.PSQL_PATH);
  const targetPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
  let dumpPath;

  try {
    const result = await targetPool.query(`
      SELECT COUNT(*)::int AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    if (result.rows[0].table_count !== 0) {
      throw new Error('Staging public schema is not empty; refusing to apply a schema dump.');
    }
  } finally {
    await targetPool.end();
  }

  dumpPath = path.join(os.tmpdir(), `dupla-schema-${process.pid}-${Date.now()}.sql`);
  try {
    const commonEnv = { ...process.env, PGSSLMODE: 'require' };
    await runTool(pgDump, [
      '--schema-only', '--no-owner', '--no-acl', '--schema=public',
      '--host', source.hostname, '--port', source.port,
      '--username', source.username, '--dbname', source.database,
      '--file', dumpPath,
    ], { ...commonEnv, PGPASSWORD: source.password });

    // Fresh PostgreSQL databases already contain the public schema.
    const schemaDump = fs.readFileSync(dumpPath, 'utf8');
    fs.writeFileSync(dumpPath, schemaDump.replace(/^CREATE SCHEMA public;\s*$/gim, ''), { mode: 0o600 });

    await runTool(psql, [
      '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--single-transaction',
      '--host', target.hostname, '--port', target.port,
      '--username', target.username, '--dbname', target.database,
      '--file', dumpPath,
    ], { ...commonEnv, PGPASSWORD: target.password });

    console.log('Production public schema copied to the empty staging database. No table rows were exported.');
  } finally {
    if (dumpPath) fs.rmSync(dumpPath, { force: true });
  }
}

copySchema().catch((error) => {
  console.error(`Schema copy stopped: ${error.message}`);
  process.exitCode = 1;
});
