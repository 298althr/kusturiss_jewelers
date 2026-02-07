-- Migration 015: Gifting Enhancements
-- 015_gifting_enhancements.sql

-- Add gifting fields to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gift_message TEXT,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
ADD COLUMN IF NOT EXISTS gift_addons JSONB DEFAULT '[]'; -- [{type: 'flowers', variant: 'Roses', price: 45.00}, {type: 'card', message: '...', price: 5.00}]

-- Add flower and card "virtual products" or variants if needed
-- For now we can handle them as addons in the JSONB field during checkout
