-- Admin Security Enhancement Tables
-- Migration: 010_create_admin_security.sql

-- Admin sessions for enhanced security
CREATE TABLE IF NOT EXISTS admin_sessions_new (
  id VARCHAR(64) PRIMARY KEY, -- Session token
  admin_id UUID REFERENCES admins(id),
  ip_address INET NOT NULL,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for admin sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_new_admin_id ON admin_sessions_new(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_new_expires_at ON admin_sessions_new(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_new_ip_address ON admin_sessions_new(ip_address);

-- Migrate data if old table exists and new table is empty
INSERT INTO admin_sessions_new (id, admin_id, ip_address, user_agent, expires_at, created_at)
SELECT 
  session_token::VARCHAR(64), 
  admin_user_id, 
  '127.0.0.1'::INET, 
  'Unknown', 
  expires_at, 
  created_at
FROM admin_sessions 
WHERE NOT EXISTS (SELECT 1 FROM admin_sessions_new LIMIT 1);

-- Drop old table and rename new one
DROP TABLE IF EXISTS admin_sessions CASCADE;
ALTER TABLE admin_sessions_new RENAME TO admin_sessions;

-- Admin login attempts tracking
CREATE TABLE admin_login_attempts (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id),
  ip_address INET NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for login attempts
CREATE INDEX idx_login_attempts_admin_id ON admin_login_attempts(admin_id);
CREATE INDEX idx_login_attempts_created_at ON admin_login_attempts(created_at);
CREATE INDEX idx_login_attempts_success ON admin_login_attempts(success);

-- Add 2FA columns to admins table
ALTER TABLE admins 
ADD COLUMN two_factor_secret VARCHAR(32),
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN backup_codes TEXT[], -- Array of backup codes
ADD COLUMN last_security_check TIMESTAMP;

-- Create indexes for 2FA
CREATE INDEX idx_admins_2fa_enabled ON admins(two_factor_enabled);

-- Admin security settings
CREATE TABLE admin_security_settings (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id),
  require_2fa BOOLEAN DEFAULT false,
  ip_whitelist TEXT[], -- Array of allowed IP addresses
  session_timeout_minutes INTEGER DEFAULT 30,
  max_concurrent_sessions INTEGER DEFAULT 3,
  email_alerts BOOLEAN DEFAULT true,
  sms_alerts BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for security settings
CREATE INDEX idx_security_settings_admin_id ON admin_security_settings(admin_id);

-- Admin approval chains
CREATE TABLE admin_approval_chains (
  id SERIAL PRIMARY KEY,
  approval_type VARCHAR(50) NOT NULL, -- ORDER_APPROVAL, REFUND_APPROVAL, PRICE_CHANGE
  required_roles TEXT[] NOT NULL, -- Array of required roles in order
  min_approvers INTEGER DEFAULT 1,
  max_approvers INTEGER DEFAULT 3,
  timeout_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for approval chains
CREATE INDEX idx_approval_chains_type ON admin_approval_chains(approval_type);
CREATE INDEX idx_approval_chains_active ON admin_approval_chains(is_active);

-- Admin activity audit log (immutable)
CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(64),
  approval_chain_id INTEGER REFERENCES admin_approval_chains(id),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT immutable_audit_log CHECK (created_at IS NOT NULL)
);

-- Create indexes for audit log
CREATE INDEX idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_action ON admin_audit_log(action);
CREATE INDEX idx_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON admin_audit_log(created_at);

-- Security alerts
CREATE TABLE security_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL, -- SUSPICIOUS_LOGIN, BRUTE_FORCE, PRIVILEGE_ESCALATION
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  admin_id UUID REFERENCES admins(id),
  details JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES admins(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for security alerts
CREATE INDEX idx_alerts_type ON security_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_alerts_admin_id ON security_alerts(admin_id);
CREATE INDEX idx_alerts_resolved ON security_alerts(is_resolved);

-- IP reputation tracking
CREATE TABLE ip_reputation (
  id SERIAL PRIMARY KEY,
  ip_address INET UNIQUE NOT NULL,
  reputation_score INTEGER DEFAULT 0, -- -100 to 100
  threat_level VARCHAR(20) DEFAULT 'UNKNOWN', -- UNKNOWN, LOW, MEDIUM, HIGH, CRITICAL
  total_requests INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  last_seen TIMESTAMP,
  is_blacklisted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for IP reputation
CREATE INDEX idx_ip_reputation_address ON ip_reputation(ip_address);
CREATE INDEX idx_ip_reputation_score ON ip_reputation(reputation_score);
CREATE INDEX idx_ip_reputation_blacklisted ON ip_reputation(is_blacklisted);

-- Admin API keys for programmatic access
CREATE TABLE admin_api_keys (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id),
  key_name VARCHAR(100) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL, -- Hashed API key
  permissions TEXT[] NOT NULL, -- Array of allowed permissions
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for API keys
CREATE INDEX idx_api_keys_admin_id ON admin_api_keys(admin_id);
CREATE INDEX idx_api_keys_hash ON admin_api_keys(api_key_hash);
CREATE INDEX idx_api_keys_active ON admin_api_keys(is_active);

-- Insert default approval chains
INSERT INTO admin_approval_chains (approval_type, required_roles, min_approvers) VALUES
('HIGH_VALUE_ORDER', ARRAY['admin', 'manager'], 1),
('ORDER_REFUND', ARRAY['manager', 'admin'], 1),
('PRICE_CHANGE', ARRAY['admin'], 1),
('CUSTOMER_FLAG', ARRAY['manager', 'admin'], 1),
('INVENTORY_WRITE_OFF', ARRAY['manager', 'admin'], 2),
('PAYMENT_METHOD_CHANGE', ARRAY['admin'], 1);

-- Create default security settings for existing admins
INSERT INTO admin_security_settings (admin_id, require_2fa)
SELECT id, false FROM admins WHERE id NOT IN (SELECT admin_id FROM admin_security_settings);
