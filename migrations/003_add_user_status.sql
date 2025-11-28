-- Add status column to users table for blocking functionality
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Update existing users to have 'active' status
UPDATE users SET status = 'active' WHERE status IS NULL;
