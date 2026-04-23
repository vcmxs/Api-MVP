const pool = require('./db');

async function checkReferrals() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT re.id, re.referrer_id, re.referred_user_id, re.amount, re.status, re.created_at,
             u.name as referrer_name, u.email as referrer_email,
             t.name as referred_name
      FROM referral_earnings re
      JOIN users u ON re.referrer_id = u.id
      LEFT JOIN users t ON re.referred_user_id = t.id
      ORDER BY re.created_at DESC
    `);
    console.log(`\n=== referral_earnings: ${res.rows.length} rows ===`);
    res.rows.forEach(r => console.log(r));

    const payouts = await client.query(`SELECT * FROM payouts ORDER BY created_at DESC`);
    console.log(`\n=== payouts: ${payouts.rows.length} rows ===`);
    payouts.rows.forEach(r => console.log(r));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

checkReferrals();
