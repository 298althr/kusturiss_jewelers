-- Migration 014: Concierge, Corporate, and Shipping Integration
-- 014_concierge_and_shipping.sql

-- Specialized Services (Proposals, Surprises, Birthdays)
CREATE TABLE IF NOT EXISTS concierge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    service_type VARCHAR(100) NOT NULL, -- 'proposal_planning', 'surprise_delivery', 'birthday_coordinator', 'anniversary'
    budget_range VARCHAR(50),
    preferred_date DATE,
    recipient_details JSONB, -- {name, contact, address}
    addons JSONB DEFAULT '[]', -- ['flowers', 'champagne', 'private_musician']
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'assigned', 'curated', 'completed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corporate Gifting & Services
CREATE TABLE IF NOT EXISTS corporate_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    industry VARCHAR(100),
    estimated_annual_spend DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'lead', -- 'lead', 'active', 'preferred'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipping Integration (USPS Sync)
CREATE TABLE IF NOT EXISTS shipping_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    carrier VARCHAR(50) DEFAULT 'USPS',
    tracking_number VARCHAR(100),
    label_url TEXT,
    shipping_cost DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'preparing', -- 'label_created', 'in_transit', 'delivered'
    metadata JSONB, -- Store raw USPS API response snippets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Local Partners (Florists, Caterers for Surprises)
CREATE TABLE IF NOT EXISTS business_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'florist', 'catering', 'venue'
    location JSONB, -- {address, city, state, zip, lat, lng}
    contact_info JSONB,
    partnership_level VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concierge_type ON concierge_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_shipping_tracking ON shipping_shipments(tracking_number);
