-- Fraud Detection System Tables
-- Migration: 009_create_fraud_detection.sql

-- Fraud detection logs
CREATE TABLE fraud_detection_logs (
  id SERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  fraud_score INTEGER NOT NULL,
  fraud_level VARCHAR(20) NOT NULL, -- MINIMAL, LOW, MEDIUM, HIGH, CRITICAL
  risk_factors JSONB DEFAULT '[]',
  requires_manual_review BOOLEAN DEFAULT false,
  recommendations JSONB DEFAULT '[]',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fraud detection
CREATE INDEX idx_fraud_logs_order_id ON fraud_detection_logs(order_id);
CREATE INDEX idx_fraud_logs_level ON fraud_detection_logs(fraud_level);
CREATE INDEX idx_fraud_logs_created_at ON fraud_detection_logs(created_at);
CREATE INDEX idx_fraud_logs_manual_review ON fraud_detection_logs(requires_manual_review);

-- Suspicious activities tracking
CREATE TABLE suspicious_activities (
  id SERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  activity_type VARCHAR(50) NOT NULL, -- RAPID_ORDERS, FAILED_PAYMENTS, SUSPICIOUS_ADDRESS
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES admins(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for suspicious activities
CREATE INDEX idx_suspicious_customer_id ON suspicious_activities(customer_id);
CREATE INDEX idx_suspicious_activity_type ON suspicious_activities(activity_type);
CREATE INDEX idx_suspicious_severity ON suspicious_activities(severity);
CREATE INDEX idx_suspicious_resolved ON suspicious_activities(resolved);

-- Device fingerprinting
CREATE TABLE device_fingerprints (
  id SERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  fingerprint_hash VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  screen_resolution VARCHAR(20),
  timezone VARCHAR(50),
  language VARCHAR(10),
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  is_suspicious BOOLEAN DEFAULT false
);

-- Create indexes for device fingerprints
CREATE INDEX idx_device_customer_id ON device_fingerprints(customer_id);
CREATE INDEX idx_device_fingerprint_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_is_suspicious ON device_fingerprints(is_suspicious);

-- Payment method risk tracking
CREATE TABLE payment_method_risks (
  id SERIAL PRIMARY KEY,
  payment_method VARCHAR(50) NOT NULL,
  risk_score INTEGER DEFAULT 0,
  failure_rate DECIMAL(5,2) DEFAULT 0.00,
  chargeback_rate DECIMAL(5,2) DEFAULT 0.00,
  total_transactions INTEGER DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0.00,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indexes for payment method risks
CREATE INDEX idx_payment_method ON payment_method_risks(payment_method);

-- Geographic risk data
CREATE TABLE geographic_risks (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  region VARCHAR(100),
  city VARCHAR(100),
  risk_score INTEGER DEFAULT 0,
  fraud_rate DECIMAL(5,2) DEFAULT 0.00,
  total_orders INTEGER DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0.00,
  is_high_risk BOOLEAN DEFAULT false,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indexes for geographic risks
CREATE INDEX idx_geo_country ON geographic_risks(country_code);
CREATE INDEX idx_geo_risk_score ON geographic_risks(risk_score);

-- Admin approval workflows
CREATE TABLE admin_approvals (
  id SERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  admin_id UUID REFERENCES admins(id),
  approval_type VARCHAR(50) NOT NULL, -- FRAUD_REVIEW, HIGH_VALUE_ORDER, MANUAL_VERIFICATION
  status VARCHAR(20) NOT NULL, -- PENDING, APPROVED, REJECTED, ESCALATED
  notes TEXT,
  approval_chain JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for admin approvals
CREATE INDEX idx_approvals_order_id ON admin_approvals(order_id);
CREATE INDEX idx_approvals_admin_id ON admin_approvals(admin_id);
CREATE INDEX idx_approvals_status ON admin_approvals(status);

-- Add fraud-related columns to orders table
ALTER TABLE orders 
ADD COLUMN fraud_score INTEGER DEFAULT 0,
ADD COLUMN fraud_level VARCHAR(20) DEFAULT 'MINIMAL',
ADD COLUMN requires_manual_review BOOLEAN DEFAULT false,
ADD COLUMN fraud_reviewed_by UUID REFERENCES admins(id),
ADD COLUMN fraud_reviewed_at TIMESTAMP;

-- Create indexes for new order columns
CREATE INDEX idx_orders_fraud_score ON orders(fraud_score);
CREATE INDEX idx_orders_fraud_level ON orders(fraud_level);
CREATE INDEX idx_orders_manual_review ON orders(requires_manual_review);

-- Add risk assessment to customers table
ALTER TABLE customers
ADD COLUMN risk_score INTEGER DEFAULT 0,
ADD COLUMN risk_level VARCHAR(20) DEFAULT 'LOW',
ADD COLUMN is_flagged BOOLEAN DEFAULT false,
ADD COLUMN flag_reason TEXT,
ADD COLUMN flagged_by UUID REFERENCES admins(id),
ADD COLUMN flagged_at TIMESTAMP;

-- Create indexes for new customer columns
CREATE INDEX idx_customers_risk_score ON customers(risk_score);
CREATE INDEX idx_customers_is_flagged ON customers(is_flagged);

-- Insert default payment method risks
INSERT INTO payment_method_risks (payment_method, risk_score) VALUES
('credit_card', 20),
('debit_card', 15),
('paypal', 10),
('apple_pay', 5),
('google_pay', 5),
('bank_transfer', 30),
('crypto', 200),
('cash_on_delivery', 50);

-- Insert default geographic risks (simplified)
INSERT INTO geographic_risks (country_code, region, risk_score, is_high_risk) VALUES
('US', 'United States', 10, false),
('CA', 'Canada', 10, false),
('GB', 'United Kingdom', 15, false),
('AU', 'Australia', 15, false),
('DE', 'Germany', 10, false),
('FR', 'France', 10, false),
('JP', 'Japan', 10, false),
('CN', 'China', 40, true),
('RU', 'Russia', 60, true),
('NG', 'Nigeria', 80, true);
