-- Migration 002: Add Admin Role and Subscription Infrastructure
-- This migration adds subscription tracking fields and enables admin role

-- Step 1: Drop existing role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new role constraint that includes 'admin'
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('coach', 'trainee', 'admin'));

-- Step 3: Add subscription and admin support fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Step 4: Create first admin user (CHANGE PASSWORD IN PRODUCTION!)
INSERT INTO users (name, email, password, role, subscription_status, subscription_tier)
VALUES ('Super Admin', 'admin@gymtrainer.com', 'admin123', 'admin', 'active', 'enterprise')
ON CONFLICT (email) DO NOTHING;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Display success message
SELECT 'Migration 002 completed successfully!' as message;
