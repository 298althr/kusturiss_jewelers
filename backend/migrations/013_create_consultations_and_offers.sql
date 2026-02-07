-- Migration 013: Create Consultations and Jewelry Purchases
-- 013_create_consultations_and_offers.sql

-- Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    type VARCHAR(50) DEFAULT 'in-person', -- 'virtual', 'in-person'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jewelry Purchase Offers (Sell to Us)
CREATE TABLE IF NOT EXISTS jewelry_purchase_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    item_type VARCHAR(100) NOT NULL, -- 'Ring', 'Necklace', 'Watch', etc.
    material VARCHAR(100), -- 'Gold 14k', 'Platinum', etc.
    description TEXT NOT NULL,
    images JSONB DEFAULT '[]', -- Array of image URLs
    status VARCHAR(50) DEFAULT 'pending_review', -- 'pending_review', 'appraisal', 'offer_made', 'accepted', 'rejected'
    estimated_valuation DECIMAL(12, 2),
    offered_price DECIMAL(12, 2),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(appointment_date);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_jewelry_offers_status ON jewelry_purchase_offers(status);
