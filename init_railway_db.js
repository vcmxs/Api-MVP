const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:cfdxeVUoWoASRhmrJRGSbqhfzFBrMXqo@mainline.proxy.rlwy.net:56505/railway';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const createTablesQuery = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) CHECK (role IN ('coach', 'trainee', 'admin')),
      age INTEGER,
      sex VARCHAR(20),
      phone VARCHAR(20),
      gym VARCHAR(100),
      notes TEXT,
      profile_pic_url VARCHAR(255),
      subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'free')),
      subscription_tier VARCHAR(20) DEFAULT 'basic',
      subscription_start_date TIMESTAMP,
      subscription_end_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked'))
  );

  -- Workouts table
  CREATE TABLE IF NOT EXISTS workouts (
      id SERIAL PRIMARY KEY,
      coach_id INTEGER REFERENCES users(id),
      trainee_id INTEGER REFERENCES users(id),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Workout Exercises table
  CREATE TABLE IF NOT EXISTS workout_exercises (
      id SERIAL PRIMARY KEY,
      workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      sets INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      target_weight DECIMAL(5,2),
      notes TEXT,
      "order" INTEGER,
      category VARCHAR(50)
  );

  -- Exercise Logs table
  CREATE TABLE IF NOT EXISTS exercise_logs (
      id SERIAL PRIMARY KEY,
      workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      weight_used DECIMAL(5,2),
      reps_completed INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert Default Users if not exist
  INSERT INTO users (name, email, password, role, subscription_status) 
  SELECT 'Coach Mike', 'coach@gym.com', 'coach123', 'coach', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'coach@gym.com');

  INSERT INTO users (name, email, password, role) 
  SELECT 'John Trainee', 'john@gym.com', 'john123', 'trainee'
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'john@gym.com');

  INSERT INTO users (name, email, password, role) 
  SELECT 'Super Admin', 'admin@gymtrainer.com', 'admin123', 'admin'
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@gymtrainer.com');
`;

async function initDB() {
    console.log('Connecting to Railway DB...');
    const client = await pool.connect();
    try {
        console.log('Running initialization query...');
        await client.query(createTablesQuery);
        console.log('✅ Tables created and default users seeded successfully!');
    } catch (err) {
        console.error('❌ Error initializing DB:', err);
    } finally {
        client.release();
        pool.end();
    }
}

initDB();
