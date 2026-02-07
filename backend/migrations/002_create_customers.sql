-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(200),
    last_name VARCHAR(200),
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    accepts_marketing BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer addresses
CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- shipping, billing
    first_name VARCHAR(200),
    last_name VARCHAR(200),
    company VARCHAR(200),
    address1 VARCHAR(500) NOT NULL,
    address2 VARCHAR(500),
    city VARCHAR(200) NOT NULL,
    province VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(50),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customer sessions (for authentication)
CREATE TABLE customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customer preferences
CREATE TABLE customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    marketing_consent BOOLEAN DEFAULT false,
    analytics_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer tags (for segmentation)
CREATE TABLE customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customer-tag relationships
CREATE TABLE customer_tag_relationships (
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES customer_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (customer_id, tag_id)
);

-- Indexes for performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_last_login_at ON customers(last_login_at);
CREATE INDEX idx_customers_email_verification_token ON customers(email_verification_token);
CREATE INDEX idx_customers_password_reset_token ON customers(password_reset_token);
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_type ON customer_addresses(type);
CREATE INDEX idx_customer_addresses_is_default ON customer_addresses(is_default);
CREATE INDEX idx_customer_sessions_customer_id ON customer_sessions(customer_id);
CREATE INDEX idx_customer_sessions_session_token ON customer_sessions(session_token);
CREATE INDEX idx_customer_sessions_expires_at ON customer_sessions(expires_at);
CREATE INDEX idx_customer_preferences_customer_id ON customer_preferences(customer_id);
CREATE INDEX idx_customer_tags_name ON customer_tags(name);
CREATE INDEX idx_customer_tag_relationships_customer_id ON customer_tag_relationships(customer_id);
CREATE INDEX idx_customer_tag_relationships_tag_id ON customer_tag_relationships(tag_id);

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_preferences_updated_at BEFORE UPDATE ON customer_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM customer_sessions WHERE expires_at < NOW();
    DELETE FROM cart_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create default customer tags
INSERT INTO customer_tags (name, description, color) VALUES
('VIP', 'High-value customers', '#gold'),
('New', 'Recently registered customers', '#28a745'),
('Inactive', 'Customers who haven''t purchased recently', '#dc3545'),
('Wholesale', 'Business customers', '#6f42c1');
