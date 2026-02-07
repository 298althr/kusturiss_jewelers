-- Business settings
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(200) NOT NULL,
    store_email VARCHAR(255) NOT NULL,
    store_phone VARCHAR(50),
    store_address JSONB,
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    weight_unit VARCHAR(10) DEFAULT 'kg', -- kg, lb, g, oz
    tax_included BOOLEAN DEFAULT false,
    tax_rate DECIMAL(5,2) DEFAULT 0, -- Simple tax rate (can be extended)
    shipping_enabled BOOLEAN DEFAULT true,
    free_shipping_threshold DECIMAL(10,2),
    social_links JSONB, -- {facebook, instagram, twitter, etc.}
    seo_settings JSONB, -- Default SEO settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Shipping zones and rates
CREATE TABLE shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    countries JSONB NOT NULL, -- Array of country codes
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipping_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    min_weight DECIMAL(8,2),
    max_weight DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tax rates (for more complex tax scenarios)
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    rate DECIMAL(5,4) NOT NULL, -- More precise for tax calculations
    country VARCHAR(2),
    province VARCHAR(100),
    postal_code_pattern VARCHAR(100), -- Regex pattern for postal codes
    is_compound BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin users
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(200),
    last_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'admin', -- admin, manager, staff
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin sessions
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_business_settings_id ON business_settings(id);
CREATE INDEX idx_shipping_zones_id ON shipping_zones(id);
CREATE INDEX idx_shipping_rates_zone_id ON shipping_rates(zone_id);
CREATE INDEX idx_tax_rates_country ON tax_rates(country);
CREATE INDEX idx_tax_rates_province ON tax_rates(province);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_system_settings_key ON system_settings(key);

-- Triggers for updated_at
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON tax_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default business settings
INSERT INTO business_settings (
    store_name, store_email, currency, timezone, weight_unit
) VALUES (
    'My Store', 'contact@mystore.com', 'USD', 'America/New_York', 'kg'
);

-- Insert default shipping zones
INSERT INTO shipping_zones (name, countries) VALUES
('United States', '["US"]'),
('Canada', '["CA"]'),
('Europe', '["GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "IE", "PT", "GR"]'),
('International', '[]'); -- Empty array means all other countries

-- Insert default shipping rates for US
INSERT INTO shipping_rates (zone_id, name, price, min_weight, max_weight) VALUES
((SELECT id FROM shipping_zones WHERE name = 'United States'), 'Standard Shipping', 9.99, 0, 10),
((SELECT id FROM shipping_zones WHERE name = 'United States'), 'Express Shipping', 19.99, 0, 10),
((SELECT id FROM shipping_zones WHERE name = 'United States'), 'Heavy Item Shipping', 29.99, 10, 50);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('maintenance_mode', 'false', 'Enable maintenance mode'),
('allow_guest_checkout', 'true', 'Allow customers to checkout without account'),
('require_email_verification', 'false', 'Require email verification for new accounts'),
('session_timeout', '86400', 'Session timeout in seconds'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('password_min_length', '8', 'Minimum password length'),
('enable_two_factor', 'false', 'Enable two-factor authentication for admins');

-- Create default admin user (password: admin123)
INSERT INTO admin_users (email, password_hash, first_name, last_name, role) VALUES
('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvOe', 'Admin', 'User', 'admin');
