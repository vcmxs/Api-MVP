CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_name VARCHAR(255) NOT NULL DEFAULT 'System',
    admin_email VARCHAR(255) NOT NULL DEFAULT 'system@dupla.com',
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('security', 'user_management', 'financial', 'system')),
    action_name VARCHAR(255) NOT NULL,
    details TEXT,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
