const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:9426242801@localhost:5432/gym_training_app' });
async function fix() {
  const res = await pool.query("SELECT user_id, logged_date, SUM(f.calories * ml.serving_quantity) as c, SUM(f.proteins * ml.serving_quantity) as p, SUM(f.carbs * ml.serving_quantity) as cb, SUM(f.fats * ml.serving_quantity) as f FROM meal_logs ml JOIN foods f ON ml.food_id = f.id GROUP BY user_id, logged_date");
  for (let row of res.rows) {
    await pool.query('UPDATE daily_nutrition_summary SET total_calories=$1, total_proteins=$2, total_carbs=$3, total_fats=$4 WHERE user_id=$5 AND summary_date=$6', [row.c, row.p, row.cb, row.f, row.user_id, row.logged_date]);
  }
  console.log('Fixed DB summaries');
  pool.end();
}
fix();
