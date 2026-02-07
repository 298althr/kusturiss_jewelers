-- Capital Control System Tables
-- Migration: 011_create_capital_control.sql

-- Product costs tracking
CREATE TABLE product_costs (
  id SERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  cost_type VARCHAR(50) NOT NULL, -- cogs, shipping, payment, marketing, storage, returns
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for product costs
CREATE INDEX idx_product_costs_product_id ON product_costs(product_id);
CREATE INDEX idx_product_costs_type ON product_costs(cost_type);
CREATE INDEX idx_product_costs_date ON product_costs(date);

-- Capital alerts
CREATE TABLE capital_alerts (
  id SERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  alert_type VARCHAR(50) NOT NULL, -- MARGIN_BREACH, LOW_TURNOVER, HIGH_INVENTORY, DEAD_STOCK
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  details JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES admins(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for capital alerts
CREATE INDEX idx_capital_alerts_product_id ON capital_alerts(product_id);
CREATE INDEX idx_capital_alerts_type ON capital_alerts(alert_type);
CREATE INDEX idx_capital_alerts_severity ON capital_alerts(severity);
CREATE INDEX idx_capital_alerts_resolved ON capital_alerts(is_resolved);

-- SKU performance tracking
CREATE TABLE sku_performance (
  id SERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  revenue DECIMAL(15,2) DEFAULT 0.00,
  cogs DECIMAL(15,2) DEFAULT 0.00,
  gross_profit DECIMAL(15,2) DEFAULT 0.00,
  net_profit DECIMAL(15,2) DEFAULT 0.00,
  gross_margin DECIMAL(5,2) DEFAULT 0.00,
  net_margin DECIMAL(5,2) DEFAULT 0.00,
  inventory_turnover DECIMAL(8,2) DEFAULT 0.00,
  days_of_inventory INTEGER DEFAULT 0,
  capital_allocated DECIMAL(15,2) DEFAULT 0.00,
  capital_efficiency DECIMAL(8,2) DEFAULT 0.00,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for SKU performance
CREATE INDEX idx_sku_performance_product_id ON sku_performance(product_id);
CREATE INDEX idx_sku_performance_period ON sku_performance(period_start, period_end);
CREATE INDEX idx_sku_performance_margin ON sku_performance(net_margin);

-- Capital allocation limits
CREATE TABLE capital_allocation_limits (
  id SERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  category VARCHAR(100),
  max_capital_per_sku DECIMAL(15,2) DEFAULT 10000.00,
  min_margin_threshold DECIMAL(5,2) DEFAULT 20.00,
  max_discount_percentage DECIMAL(5,2) DEFAULT 30.00,
  low_stock_threshold INTEGER DEFAULT 10,
  dead_stock_days INTEGER DEFAULT 90,
  inventory_turnover_target DECIMAL(8,2) DEFAULT 6.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for capital allocation limits
CREATE INDEX idx_capital_limits_product_id ON capital_allocation_limits(product_id);
CREATE INDEX idx_capital_limits_category ON capital_allocation_limits(category);

-- Inventory write-offs
CREATE TABLE inventory_write_offs (
  id SERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  write_off_reason VARCHAR(100) NOT NULL, -- DAMAGE, OBSOLETE, EXPIRED, THEFT, LOSS
  write_off_value DECIMAL(10,2) NOT NULL,
  approved_by UUID REFERENCES admins(id),
  approval_chain_id INTEGER REFERENCES admin_approval_chains(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for inventory write-offs
CREATE INDEX idx_write_offs_product_id ON inventory_write_offs(product_id);
CREATE INDEX idx_write_offs_reason ON inventory_write_offs(write_off_reason);
CREATE INDEX idx_write_offs_approved_by ON inventory_write_offs(approved_by);

-- Margin protection rules
CREATE TABLE margin_protection_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- MIN_MARGIN, MAX_DISCOUNT, PRICE_FLOOR, CAPITAL_LIMIT
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for margin protection rules
CREATE INDEX idx_margin_rules_type ON margin_protection_rules(rule_type);
CREATE INDEX idx_margin_rules_active ON margin_protection_rules(is_active);
CREATE INDEX idx_margin_rules_priority ON margin_protection_rules(priority);

-- Capital efficiency metrics
CREATE TABLE capital_efficiency_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  total_capital_allocated DECIMAL(15,2) DEFAULT 0.00,
  total_revenue DECIMAL(15,2) DEFAULT 0.00,
  total_profit DECIMAL(15,2) DEFAULT 0.00,
  capital_turnover DECIMAL(8,2) DEFAULT 0.00,
  roi_percentage DECIMAL(5,2) DEFAULT 0.00,
  inventory_days INTEGER DEFAULT 0,
  dead_stock_value DECIMAL(15,2) DEFAULT 0.00,
  slow_stock_value DECIMAL(15,2) DEFAULT 0.00,
  active_skus INTEGER DEFAULT 0,
  total_skus INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for capital efficiency metrics
CREATE INDEX idx_capital_metrics_date ON capital_efficiency_metrics(metric_date);

-- Add capital tracking to products
ALTER TABLE products
ADD COLUMN capital_allocated DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN last_cost_update TIMESTAMP,
ADD COLUMN margin_protection_enabled BOOLEAN DEFAULT true;

-- Create indexes for new product columns
CREATE INDEX idx_products_capital_allocated ON products(capital_allocated);
CREATE INDEX idx_products_margin_protection ON products(margin_protection_enabled);

-- Insert default capital allocation limits
INSERT INTO capital_allocation_limits (category, max_capital_per_sku) VALUES
('Electronics', 25000.00),
('Clothing', 5000.00),
('Home & Garden', 15000.00),
('Sports & Outdoors', 10000.00),
('Books', 2000.00),
('Toys & Games', 8000.00),
('Health & Beauty', 12000.00),
('Automotive', 20000.00),
('Food & Beverages', 3000.00),
('Other', 10000.00);

-- Insert default margin protection rules
INSERT INTO margin_protection_rules (rule_name, rule_type, conditions, actions, priority) VALUES
('Minimum Margin Protection', 'MIN_MARGIN', 
 '{"min_margin": 20, "product_categories": ["all"]}',
 '{"block_discount": true, "require_approval": true}', 
 100),

('Maximum Discount Limit', 'MAX_DISCOUNT',
 '{"max_discount": 30, "high_value_threshold": 1000}',
 '{"limit_discount": true, "escalate_approval": true}',
 90),

('Price Floor Protection', 'PRICE_FLOOR',
 '{"min_margin": 15, "cost_plus_percentage": 10}',
 '{"prevent_underpricing": true, "auto_correct": false}',
 80),

('Capital Allocation Limit', 'CAPITAL_LIMIT',
 '{"max_per_sku": 10000, "category_limits": true}',
 '{"block_overallocation": true, "alert_excess": true}',
 70);

-- Create trigger to update capital allocation when inventory changes
CREATE OR REPLACE FUNCTION update_product_capital_allocation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET capital_allocated = inventory_count * COALESCE(cost_price, 0),
      last_cost_update = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory write-offs
CREATE TRIGGER trigger_update_capital_on_write_off
AFTER INSERT ON inventory_write_offs
FOR EACH ROW
EXECUTE FUNCTION update_product_capital_allocation();

-- Create trigger for product cost updates
CREATE TRIGGER trigger_update_capital_on_cost_change
AFTER UPDATE ON products
FOR EACH ROW
WHEN (OLD.cost_price IS DISTINCT FROM NEW.cost_price OR OLD.inventory_count IS DISTINCT FROM NEW.inventory_count)
EXECUTE FUNCTION update_product_capital_allocation();
