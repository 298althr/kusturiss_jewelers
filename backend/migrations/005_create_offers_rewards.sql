-- Offers system
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- percentage, fixed_amount, free_shipping, buy_x_get_y
    value DECIMAL(10,2), -- Discount value or percentage
    minimum_amount DECIMAL(10,2),
    minimum_quantity INTEGER DEFAULT 1,
    usage_limit_per_customer INTEGER,
    usage_limit_total INTEGER,
    used_count INTEGER DEFAULT 0,
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    auto_apply BOOLEAN DEFAULT false,
    product_ids UUID[], -- Array of product IDs this applies to
    category_ids UUID[], -- Array of category IDs this applies to
    customer_tag_ids UUID[], -- Array of customer tag IDs this applies to
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Offer codes (for discount codes)
CREATE TABLE offer_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    code VARCHAR(100) UNIQUE NOT NULL,
    usage_limit_per_customer INTEGER,
    usage_limit_total INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Offer usage tracking
CREATE TABLE offer_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    offer_code_id UUID REFERENCES offer_codes(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rewards program
CREATE TABLE rewards_program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    points_per_dollar DECIMAL(5,2) DEFAULT 1.00,
    points_value DECIMAL(5,4) DEFAULT 0.0100, -- 100 points = $1
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer reward points
CREATE TABLE customer_reward_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reward point transactions
CREATE TABLE reward_point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    points INTEGER NOT NULL, -- Positive for earning, negative for redemption
    type VARCHAR(50) NOT NULL, -- purchase, redemption, bonus, adjustment, expiration
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reward tiers
CREATE TABLE reward_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rewards_program_id UUID REFERENCES rewards_program(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    multiplier DECIMAL(3,2) DEFAULT 1.00, -- Points multiplier
    benefits JSONB, -- Array of benefits for this tier
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customer reward tiers
CREATE TABLE customer_reward_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    reward_tier_id UUID REFERENCES reward_tiers(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_offers_type ON offers(type);
CREATE INDEX idx_offers_is_active ON offers(is_active);
CREATE INDEX idx_offers_starts_at ON offers(starts_at);
CREATE INDEX idx_offers_expires_at ON offers(expires_at);
CREATE INDEX idx_offer_codes_code ON offer_codes(code);
CREATE INDEX idx_offer_codes_offer_id ON offer_codes(offer_id);
CREATE INDEX idx_offer_usage_offer_id ON offer_usage(offer_id);
CREATE INDEX idx_offer_usage_customer_id ON offer_usage(customer_id);
CREATE INDEX idx_offer_usage_order_id ON offer_usage(order_id);
CREATE INDEX idx_rewards_program_is_active ON rewards_program(is_active);
CREATE INDEX idx_customer_reward_points_customer_id ON customer_reward_points(customer_id);
CREATE INDEX idx_reward_point_transactions_customer_id ON reward_point_transactions(customer_id);
CREATE INDEX idx_reward_point_transactions_order_id ON reward_point_transactions(order_id);
CREATE INDEX idx_reward_point_transactions_type ON reward_point_transactions(type);
CREATE INDEX idx_reward_tiers_rewards_program_id ON reward_tiers(rewards_program_id);
CREATE INDEX idx_reward_tiers_min_points ON reward_tiers(min_points);
CREATE INDEX idx_customer_reward_tiers_customer_id ON customer_reward_tiers(customer_id);
CREATE INDEX idx_customer_reward_tiers_reward_tier_id ON customer_reward_tiers(reward_tier_id);

-- Triggers for updated_at
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_program_updated_at BEFORE UPDATE ON rewards_program
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_reward_points_updated_at BEFORE UPDATE ON customer_reward_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update offer usage count
CREATE OR REPLACE FUNCTION increment_offer_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE offers SET used_count = used_count + 1 WHERE id = NEW.offer_id;
    IF NEW.offer_code_id IS NOT NULL THEN
        UPDATE offer_codes SET used_count = used_count + 1 WHERE id = NEW.offer_code_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_offer_usage_trigger AFTER INSERT ON offer_usage
    FOR EACH ROW EXECUTE FUNCTION increment_offer_usage();

-- Function to update customer reward points
CREATE OR REPLACE FUNCTION update_customer_points()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customer_reward_points (customer_id, points_balance, points_earned, points_redeemed)
    VALUES (NEW.customer_id, 
            GREATEST(0, (SELECT COALESCE(points_balance, 0) FROM customer_reward_points WHERE customer_id = NEW.customer_id) + NEW.points),
            GREATEST(0, NEW.points),
            GREATEST(0, -NEW.points))
    ON CONFLICT (customer_id) 
    DO UPDATE SET 
        points_balance = GREATEST(0, customer_reward_points.points_balance + NEW.points),
        points_earned = customer_reward_points.points_earned + GREATEST(0, NEW.points),
        points_redeemed = customer_reward_points.points_redeemed + GREATEST(0, -NEW.points),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_points_trigger AFTER INSERT ON reward_point_transactions
    FOR EACH ROW EXECUTE FUNCTION update_customer_points();

-- Insert default rewards program
INSERT INTO rewards_program (name, description, points_per_dollar, points_value) VALUES
('Default Rewards Program', 'Earn points on purchases and redeem for discounts', 1.00, 0.0100);

-- Insert default reward tiers
INSERT INTO reward_tiers (rewards_program_id, name, min_points, max_points, multiplier, benefits) VALUES
((SELECT id FROM rewards_program WHERE name = 'Default Rewards Program'), 'Bronze', 0, 999, 1.00, '["Standard rewards"]'),
((SELECT id FROM rewards_program WHERE name = 'Default Rewards Program'), 'Silver', 1000, 4999, 1.50, '["1.5x points", "Free shipping on orders over $50"]'),
((SELECT id FROM rewards_program WHERE name = 'Default Rewards Program'), 'Gold', 5000, 9999, 2.00, '["2x points", "Free shipping on all orders", "Exclusive offers"]'),
((SELECT id FROM rewards_program WHERE name = 'Default Rewards Program'), 'Platinum', 10000, NULL, 3.00, '["3x points", "Free shipping", "VIP customer service", "Early access to sales"]');
