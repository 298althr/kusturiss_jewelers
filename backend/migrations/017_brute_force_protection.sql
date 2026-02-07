-- Migration 017: Brute Force Protection
-- 017_brute_force_protection.sql

CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    identifier TEXT NOT NULL, -- email or IP
    type TEXT NOT NULL, -- 'admin' or 'customer'
    attempt_time TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier, attempt_time);

-- Add lockout fields to admins and customers if not present
ALTER TABLE admins ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
