// db.js
const { Pool } = require('pg');

const pool = new Pool({
  // En producción usa DATABASE_URL, en desarrollo usa tu config local
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : 'localhost',
  port: process.env.DATABASE_URL ? undefined : 5432,
  user: process.env.DATABASE_URL ? undefined : 'postgres',
  password: process.env.DATABASE_URL ? undefined : '9426242801',
  database: process.env.DATABASE_URL ? undefined : 'gym_training_app',
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
        role VARCHAR(50) NOT NULL CHECK (role IN ('coach', 'trainee', 'admin')),
        age INTEGER,
        sex VARCHAR(20),
        phone VARCHAR(50),
        gym VARCHAR(255),
        notes TEXT,
        profile_pic_url TEXT,
        subscription_status VARCHAR(50) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
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

    // Exercise Library table (Static list of exercises)
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_library (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        muscle_category VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Exercise Library if empty
    const exerciseCount = await client.query('SELECT COUNT(*) FROM exercise_library');
    if (parseInt(exerciseCount.rows[0].count) === 0) {
      console.log('Seeding exercise library...');
      await client.query(`
        INSERT INTO exercise_library (name, muscle_category, description) VALUES
        ('Bench Press', 'Chest', 'Barbell bench press for chest development'),
        ('Incline Dumbbell Press', 'Chest', 'Upper chest isolation'),
        ('Push Ups', 'Chest', 'Bodyweight chest exercise'),
        ('Squat', 'Legs', 'Compound leg exercise'),
        ('Leg Press', 'Legs', 'Machine leg press'),
        ('Deadlift', 'Back', 'Compound back and posterior chain exercise'),
        ('Pull Ups', 'Back', 'Upper back bodyweight exercise'),
        ('Dumbbell Row', 'Back', 'Unilateral back exercise'),
        ('Overhead Press', 'Shoulders', 'Compound shoulder exercise'),
        ('Lateral Raises', 'Shoulders', 'Shoulder isolation'),
        ('Bicep Curls', 'Arms', 'Bicep isolation'),
        ('Tricep Extensions', 'Arms', 'Tricep isolation'),
        ('Plank', 'Core', 'Isometric core exercise'),
        ('Crunches', 'Core', 'Abdominal isolation')
      `);
    }

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
