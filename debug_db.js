const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'gym_training_app',
    password: '9426242801',
    port: 5432,
});

async function debug() {
    try {
        console.log('--- Users ---');
        const users = await pool.query('SELECT id, email, role FROM users');
        console.table(users.rows);

        console.log('\n--- Workout Plans ---');
        const plans = await pool.query('SELECT id, name, trainee_id, coach_id FROM workout_plans');
        console.table(plans.rows);

        console.log('\n--- Exercises ---');
        const exercises = await pool.query('SELECT id, name, workout_plan_id FROM exercises');
        console.table(exercises.rows);

        console.log(`\n--- Unique Exercises for Coach (ID 1) ---`);
        const uniqueCoach = await pool.query(
            `SELECT DISTINCT e.name
             FROM exercises e
             JOIN workout_plans wp ON e.workout_plan_id = wp.id
             WHERE wp.trainee_id = $1
             ORDER BY e.name ASC`,
            [1]
        );
        console.log(uniqueCoach.rows);

        console.log(`\n--- Unique Exercises for Trainee (ID 2) ---`);
        const uniqueTrainee = await pool.query(
            `SELECT DISTINCT e.name
             FROM exercises e
             JOIN workout_plans wp ON e.workout_plan_id = wp.id
             WHERE wp.trainee_id = $1
             ORDER BY e.name ASC`,
            [2]
        );
        console.log(uniqueTrainee.rows);

        console.log(`\n--- Progression Data for Coach (ID 1) - 'PRESS INCLINADO EN MÁQUINA' ---`);
        const progression = await pool.query(
            `SELECT 
                el.weight_used, 
                el.reps_completed, 
                el.completed_at,
                wp.scheduled_date
             FROM exercise_logs el
             JOIN exercises e ON el.exercise_id = e.id
             JOIN workout_plans wp ON e.workout_plan_id = wp.id
             WHERE wp.trainee_id = $1 
               AND e.name ILIKE $2
             ORDER BY el.completed_at ASC`,
            [1, 'PRESS INCLINADO EN MÁQUINA']
        );
        console.table(progression.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debug();
