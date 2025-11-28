-- Migration 004: Add user profile fields
-- This migration adds personal information fields to the users table

-- Add profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sex VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gym VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('age', 'sex', 'phone', 'gym', 'profile_pic_url', 'notes')
ORDER BY column_name;
