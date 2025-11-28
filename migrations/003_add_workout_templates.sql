-- Migration 003: Add workout templates tables
-- This migration creates tables for storing reusable workout templates

-- Create workout_templates table
CREATE TABLE IF NOT EXISTS workout_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create template_exercises table
CREATE TABLE IF NOT EXISTS template_exercises (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  target_weight DECIMAL(5,2) DEFAULT 0,
  weight_unit VARCHAR(10) DEFAULT 'kg',
  rest_time INTEGER DEFAULT 60,
  notes TEXT,
  exercise_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_templates_user ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id);

-- Verify tables were created
SELECT 'workout_templates table created' as status;
SELECT 'template_exercises table created' as status;
