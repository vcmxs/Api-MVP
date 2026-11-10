// db.js
const { Pool, types } = require('pg');

// Force DATE types (OID 1082) to be returned as strings to avoid timezone conversion issues
types.setTypeParser(1082, (str) => str);

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
        height FLOAT,
        weight FLOAT,
        profile_pic_url TEXT,
        subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
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

    // Coach invite links (shareable trainee signup links, UNRELATED to referral_code)
    await client.query(`
      CREATE TABLE IF NOT EXISTS coach_invites (
        id SERIAL PRIMARY KEY,
        code VARCHAR(12) UNIQUE NOT NULL,
        coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        max_uses INTEGER,
        uses INTEGER NOT NULL DEFAULT 0,
        revoked BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_coach_invites_coach ON coach_invites(coach_id)
    `);

    // Shared Sessions table (Co-op Workouts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_sessions (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workout plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id SERIAL PRIMARY KEY,
        trainee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        coach_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shared_session_id INTEGER REFERENCES shared_sessions(id) ON DELETE SET NULL,
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
    // `source` splits the original coach-facing catalog ('catalog') from the
    // imported exercises-dataset rows ('dataset'). The dataset columns mirror
    // migrations/009_exercise_dataset.sql so a fresh database is created with
    // the same shape the import expects.
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_library (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        name_norm TEXT,
        muscle_category VARCHAR(50) NOT NULL,
        description TEXT,
        source VARCHAR(16) DEFAULT 'catalog',
        dataset_id VARCHAR(8),
        body_part VARCHAR(40),
        equipment VARCHAR(80),
        target_muscle VARCHAR(80),
        muscle_group VARCHAR(80),
        secondary_muscles JSONB DEFAULT '[]'::jsonb,
        gif_file TEXT,
        thumb_file TEXT,
        instructions_es TEXT,
        instructions_en TEXT,
        instruction_steps_es JSONB DEFAULT '[]'::jsonb,
        media_attribution VARCHAR(160),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS exercise_library_source_idx ON exercise_library (source)
    `);

    // Workout Templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        exercises JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Training Plans Templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_plans (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_weeks INTEGER DEFAULT 4,
        is_reusable BOOLEAN DEFAULT TRUE,
        program_folder_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
        schedule JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Foods table
    await client.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        carbs DECIMAL(10, 2) NOT NULL DEFAULT 0,
        fats DECIMAL(10, 2) NOT NULL DEFAULT 0,
        proteins DECIMAL(10, 2) NOT NULL DEFAULT 0,
        calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
        serving_size DECIMAL(10, 2) NOT NULL DEFAULT 100,
        serving_unit VARCHAR(20) DEFAULT 'g',
        is_custom BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Meal Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meal_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
        meal_type VARCHAR(50) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        serving_quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
        logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        food_snapshot JSONB, -- Stores food data at time of logging in case food is deleted/changed
        notes TEXT
      )
    `);

    // Daily Nutrition Summary table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_nutrition_summary (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        summary_date DATE NOT NULL,
        total_calories DECIMAL(10, 2) DEFAULT 0,
        total_carbs DECIMAL(10, 2) DEFAULT 0,
        total_fats DECIMAL(10, 2) DEFAULT 0,
        total_proteins DECIMAL(10, 2) DEFAULT 0,
        calorie_goal DECIMAL(10, 2),
        protein_goal DECIMAL(10, 2),
        carb_goal DECIMAL(10, 2),
        fat_goal DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, summary_date)
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL, -- e.g., 'system', 'workout_assigned', 'workout_completed'
        related_id INTEGER, -- ID of the related entity (workout_id, etc.)
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Push Tokens table (for Expo Push Notifications)
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        device_type VARCHAR(50), -- 'ios', 'android', etc.
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Exercise Library if empty
    const exerciseCount = await client.query('SELECT COUNT(*) FROM exercise_library');
    if (parseInt(exerciseCount.rows[0].count) === 0) {
      console.log('Seeding exercise library...');
      await client.query(`
        INSERT INTO exercise_library (name, muscle_category) VALUES
        ('Bench Press', 'Chest'),
        ('Incline Dumbbell Press', 'Chest'),
        ('Push Ups', 'Chest'),
        ('Squat', 'Legs'),
        ('Leg Press', 'Legs'),
        ('Deadlift', 'Back'),
        ('Pull Ups', 'Back'),
        ('Dumbbell Row', 'Back'),
        ('Overhead Press', 'Shoulders'),
        ('Lateral Raises', 'Shoulders'),
        ('Bicep Curls', 'Arms'),
        ('Tricep Extensions', 'Arms'),
        ('Plank', 'Core'),
        ('Crunches', 'Core')
      `);
    }

    // Insert default users
    await client.query(`
      INSERT INTO users (id, name, email, password, role, status, subscription_status, is_verified)
      VALUES 
        (1, 'Coach Mike', 'coach@gym.com', 'coach123', 'coach', 'active', 'active', TRUE),
        (2, 'John Trainee', 'john@gym.com', 'john123', 'trainee', 'active', 'inactive', TRUE),
        (3, 'Super Admin', 'admin@gymtrainer.com', 'admin123', 'admin', 'active', 'active', TRUE)
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