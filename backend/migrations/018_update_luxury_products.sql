-- Migration 018: Update Luxury Product Images
-- Clear existing to avoid duplicates
TRUNCATE TABLE product_categories CASCADE;
TRUNCATE TABLE product_variants CASCADE;
TRUNCATE TABLE product_images CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;

-- Insert High-End Categories
INSERT INTO categories (name, slug, description, is_visible) VALUES
('All Pieces', 'all-pieces', 'Full collection of Kusturiss jewelry.', true),
('Necklaces', 'necklaces', 'Fluid elegance in platinum and gold.', true),
('Rings', 'rings', 'Hand-crafted artisanal rings for an eternal legacy.', true),
('Earrings', 'earrings', 'Exquisite diamond and gemstone studs.', true),
('Bracelets', 'bracelets', 'Artisanal cuffs and link bracelets.', true);

-- Insert Products
INSERT INTO products (sku, name, description, short_description, price, status) VALUES
('KJ-NECK-001', '14k Gold Link Necklace', 'A fluid 14k solid gold link necklace, hand-polished to a mirror finish.', '14k solid gold link necklace.', 1250.00, 'active'),
('KJ-RING-002', 'Diamond Solitaire Ring', 'A classic 1ct diamond solitaire set in 18k white gold.', '1ct diamond solitaire ring.', 3400.00, 'active'),
('KJ-EAR-001', 'Tahitian Pearl Drop', 'Lustrous Tahitian pearls suspended from 14k gold threads.', 'Tahitian pearl drop earrings.', 850.00, 'active'),
('KJ-BRAC-001', 'Artisan Cuff Bangle', 'A heavy, hand-hammered 18k gold cuff.', '18k gold artisan cuff.', 2100.00, 'active'),
('KJ-RING-003', 'Etoile Sapphire Band', 'Deep blue Ceylon sapphires set in a starry gold band.', 'Sapphire and gold band.', 4800.00, 'active'),
('KJ-EAR-002', 'Pavé Diamond Studs', 'Clusters of brilliant diamonds in a pavé setting.', 'Pavé diamond stud earrings.', 1950.00, 'active');

-- Add Images (High-quality luxury jewelry photos from Unsplash)
INSERT INTO product_images (product_id, image_url, alt_text, is_primary) VALUES
((SELECT id FROM products WHERE sku = 'KJ-NECK-001'), 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1200', '14k Gold Link Necklace', true),
((SELECT id FROM products WHERE sku = 'KJ-RING-002'), 'https://images.unsplash.com/photo-1605100804763-247f67b3f41e?auto=format&fit=crop&q=80&w=1200', 'Diamond Solitaire Ring', true),
((SELECT id FROM products WHERE sku = 'KJ-EAR-001'), 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=1200', 'Tahitian Pearl Drop', true),
((SELECT id FROM products WHERE sku = 'KJ-BRAC-001'), 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=1200', 'Artisan Cuff Bangle', true),
((SELECT id FROM products WHERE sku = 'KJ-RING-003'), 'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&q=80&w=1200', 'Etoile Sapphire Band', true),
((SELECT id FROM products WHERE sku = 'KJ-EAR-002'), 'https://images.unsplash.com/photo-1617038220319-276d3cfab606?auto=format&fit=crop&q=80&w=1200', 'Pavé Diamond Studs', true);

-- Add Basic Variants
INSERT INTO product_variants (product_id, sku, name, price, inventory_count)
SELECT id, sku || '-V1', 'Standard', price, 5 FROM products;

-- Map Categories
INSERT INTO product_categories (product_id, category_id) VALUES
((SELECT id FROM products WHERE sku = 'KJ-NECK-001'), (SELECT id FROM categories WHERE slug = 'necklaces')),
((SELECT id FROM products WHERE sku = 'KJ-RING-002'), (SELECT id FROM categories WHERE slug = 'rings')),
((SELECT id FROM products WHERE sku = 'KJ-EAR-001'), (SELECT id FROM categories WHERE slug = 'earrings')),
((SELECT id FROM products WHERE sku = 'KJ-BRAC-001'), (SELECT id FROM categories WHERE slug = 'bracelets')),
((SELECT id FROM products WHERE sku = 'KJ-RING-003'), (SELECT id FROM categories WHERE slug = 'rings')),
((SELECT id FROM products WHERE sku = 'KJ-EAR-002'), (SELECT id FROM categories WHERE slug = 'earrings'));
