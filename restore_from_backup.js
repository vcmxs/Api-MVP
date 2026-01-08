const fs = require('fs');
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:cfdxeVUoWoASRhmrJRGSbqhfzFBrMXqo@mainline.proxy.rlwy.net:56505/railway';
const backupFile = 'bk2.sql';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function restore() {
    const client = await pool.connect();
    try {
        console.log('Reading backup file...');
        const sqlContent = fs.readFileSync(backupFile, 'utf8');
        const lines = sqlContent.split(/\r?\n/);

        console.log('Wiping database...');
        await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

        console.log('Restoring schema and data...');

        let currentStatement = '';
        let copyMode = false;
        let copyTable = '';
        let copyColumns = '';

        for (let line of lines) {
            if (line.trim().startsWith('--') || line.trim() === '') continue; // Skip comments/empty

            if (line.startsWith('COPY')) {
                // Start COPY mode
                // Format: COPY public.tablename (col1, col2) FROM stdin;
                const match = line.match(/COPY\s+(.+?)\s+\((.+?)\)\s+FROM\s+stdin;/);
                if (match) {
                    copyMode = true;
                    copyTable = match[1];
                    copyColumns = match[2];
                    // Execute any pending SQL before COPY
                    if (currentStatement.trim()) {
                        await client.query(currentStatement);
                        currentStatement = '';
                    }
                    console.log(`Restoring data for ${copyTable}...`);
                }
                continue;
            }

            if (copyMode) {
                if (line.trim() === '\\.') {
                    copyMode = false;
                    copyTable = '';
                    copyColumns = '';
                    continue;
                }

                // Parse COPY data line (tab separated)
                const values = line.split('\t').map(val => {
                    if (val === '\\N') return 'NULL';
                    // Check if it looks like a number
                    if (!isNaN(val) && val.trim() !== '') return val;
                    // Escape single quotes and wrap in quotes
                    return `'${val.replace(/'/g, "''")}'`;
                });

                const insertQuery = `INSERT INTO ${copyTable} (${copyColumns}) VALUES (${values.join(', ')});`;
                try {
                    await client.query(insertQuery);
                } catch (e) {
                    console.error(`Error inserting row into ${copyTable}:`, e.message);
                }
            } else {
                // Normal SQL mode
                if (line.startsWith('\\')) continue; // specific pg_dump commands usually ignored

                currentStatement += line + '\n';
                if (line.trim().endsWith(';') && !copyMode) {
                    // Execute statement
                    try {
                        // Ignore some specific failing commands often found in dumps
                        if (!currentStatement.includes('SET statement_timeout') &&
                            !currentStatement.includes('SET lock_timeout') &&
                            !currentStatement.includes('SELECT pg_catalog.set_config')) {
                            await client.query(currentStatement);
                        }
                    } catch (err) {
                        console.warn('Warning executing SQL:', err.message.split('\n')[0]);
                    }
                    currentStatement = '';
                }
            }
        }

        console.log('✅ Restore complete!');

    } catch (err) {
        console.error('❌ Restore failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

restore();
