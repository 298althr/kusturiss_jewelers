-- User Session and Tracking Tables
-- Migration: 012_create_user_sessions.sql

-- User sessions for cookie-based authentication
CREATE TABLE user_sessions (
  session_token VARCHAR(64) PRIMARY KEY,
  user_id UUID REFERENCES customers(id),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for user sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity_at);

-- Visitor tracking for analytics and compliance
CREATE TABLE visitor_tracking (
  visitor_id VARCHAR(32) PRIMARY KEY,
  first_visit TIMESTAMP NOT NULL,
  last_visit TIMESTAMP NOT NULL,
  visit_count INTEGER DEFAULT 1,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for visitor tracking
CREATE INDEX idx_visitor_tracking_first_visit ON visitor_tracking(first_visit);
CREATE INDEX idx_visitor_tracking_last_visit ON visitor_tracking(last_visit);

-- User consent management for GDPR compliance
CREATE TABLE user_consents (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES customers(id),
  consent_type VARCHAR(50) NOT NULL, -- essential, analytics, marketing, preferences
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  version VARCHAR(10) DEFAULT '1.0'
);

-- Create indexes for user consents
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_granted ON user_consents(granted);

-- User activity logging for compliance and analytics
CREATE TABLE user_activity_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES customers(id),
  visitor_id VARCHAR(32) REFERENCES visitor_tracking(visitor_id),
  session_token VARCHAR(64) REFERENCES user_sessions(session_token),
  activity_type VARCHAR(100) NOT NULL, -- login, logout, page_view, purchase, profile_update
  resource_type VARCHAR(50), -- product, order, category, profile
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for user activity log
CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_visitor_id ON user_activity_log(visitor_id);
CREATE INDEX idx_user_activity_type ON user_activity_log(activity_type);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at);

-- User preferences and settings
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES customers(id),
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Create indexes for user preferences
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(category);

-- Shopping cart persistence for logged-in users
CREATE TABLE persistent_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES customers(id),
  session_token VARCHAR(64) REFERENCES user_sessions(session_token),
  cart_data JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for persistent carts
CREATE INDEX idx_persistent_carts_user_id ON persistent_carts(user_id);
CREATE INDEX idx_persistent_carts_session_token ON persistent_carts(session_token);
CREATE INDEX idx_persistent_carts_expires_at ON persistent_carts(expires_at);

-- Wishlist for logged-in users
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES customers(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for wishlists
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_public ON wishlists(is_public);

-- Wishlist items
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  added_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for wishlist items
CREATE INDEX idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX idx_wishlist_items_product_id ON wishlist_items(product_id);

-- Add session-related columns to customers table (if not exists)
DO $$
BEGIN
  ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
  ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
END;
$$;

-- Create indexes for new customer columns
CREATE INDEX idx_customers_last_login ON customers(last_login_at);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customers_email_token ON customers(email_verification_token);
CREATE INDEX idx_customers_password_token ON customers(password_reset_token);

-- Insert default user preferences for existing customers
INSERT INTO user_preferences (user_id, preference_key, preference_value, category)
SELECT 
  id, 
  'theme', 
  '{"mode": "light", "primaryColor": "#3B82F6"}'::jsonb,
  'appearance'
FROM customers 
WHERE id NOT IN (SELECT user_id FROM user_preferences WHERE preference_key = 'theme');

INSERT INTO user_preferences (user_id, preference_key, preference_value, category)
SELECT 
  id, 
  'notifications', 
  '{"email": true, "sms": false, "push": true, "marketing": false}'::jsonb,
  'notifications'
FROM customers 
WHERE id NOT IN (SELECT user_id FROM user_preferences WHERE preference_key = 'notifications');

-- Create trigger to update user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activity_log (
      user_id, activity_type, resource_type, resource_id, details, created_at
    ) VALUES (
      NEW.id, 'ACCOUNT_CREATED', 'customer', NEW.id, 
      json_build_object('email', NEW.email, 'first_name', NEW.first_name),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new customer registration
CREATE TRIGGER trigger_log_user_activity
AFTER INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION log_user_activity();
