const pool = require('./db.js');

async function checkSchema() {
  const client = await pool.connect();
  try {
    const tables = ['referral_earnings', 'coach_payments', 'payments', 'payouts'];
    
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`\n=== Table: ${table} ===`);
      if (res.rows.length === 0) {
        console.log("(Table does not exist)");
      } else {
        res.rows.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

checkSchema();
