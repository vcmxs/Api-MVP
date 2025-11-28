// db.js
const { Pool } = require('pg');

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'gym_training_app',
//   password: '9426242801', 
//   port: 5432,
// });

const pool = new Pool({
  // En producción usa DATABASE_URL, en desarrollo usa tu config local
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : 'localhost',
  port: process.env.DATABASE_URL ? undefined : 5432,
  user: process.env.DATABASE_URL ? undefined : 'postgres',
  password: process.env.DATABASE_URL ? undefined : 'Kevincr7',
  database: process.env.DATABASE_URL ? undefined : 'gym_training',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to database:', err.stack);
  }
  console.log('✅ Connected to PostgreSQL database');
  release();
});

// Create tables
const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('coach', 'trainee')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Coach-Trainee relationship table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coach_trainee (
        id SERIAL PRIMARY KEY,
        coach_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        trainee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(coach_id, trainee_id)
      )
    `);

    // Workout plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id SERIAL PRIMARY KEY,
        trainee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        coach_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        overall_notes TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exercises table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        workout_plan_id INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        target_weight DECIMAL(10, 2) NOT NULL,
        weight_unit VARCHAR(10) DEFAULT 'kg',
        rest_time INTEGER,
        notes TEXT,
        exercise_order INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exercise logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_logs (
        id SERIAL PRIMARY KEY,
        workout_plan_id INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        reps_completed INTEGER NOT NULL,
        weight_used DECIMAL(10, 2) NOT NULL,
        weight_unit VARCHAR(10) DEFAULT 'kg',
        notes TEXT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default users
    await client.query(`
      INSERT INTO users (id, name, email, password, role)
      VALUES 
        (1, 'Coach Mike', 'coach@gym.com', 'coach123', 'coach'),
        (2, 'John Trainee', 'john@gym.com', 'john123', 'trainee')
      ON CONFLICT (email) DO NOTHING
    `);

    // Reset sequence for users table
    await client.query(`
      SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
  } finally {
    client.release();
  }
};

// Call createTables when module loads
createTables();

module.exports = pool;