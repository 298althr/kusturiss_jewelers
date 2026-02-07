-- Email System Seed Data
-- Migration: 007_seed_email_system.sql

-- Add foreign key constraint now that templates table exists
ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_template_id_fkey 
FOREIGN KEY (template_id) REFERENCES email_templates(id);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables) VALUES 
('welcome-email-1', 'Welcome to {{storeName}}! Here''s 10% off your first order', 
 '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome to {{storeName}}</title></head><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;"><div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;"><h1 style="color: #333; text-align: center;">Welcome to {{storeName}}!</h1><p>Hi {{customer.firstName}},</p><p>Thank you for joining us! Here''s a special 10% discount on your first order:</p><div style="text-align: center; margin: 30px 0;"><a href="{{storeUrl}}/shop?discount={{discountCode}}" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Shop Now - 10% Off</a></div><p>Use code: <strong>{{discountCode}}</strong></p><p>Expires in {{expiryDays}} days.</p><p>Happy shopping!</p><p>The {{storeName}} Team</p></div></body></html>',
 'Welcome to {{storeName}}! Here''s 10% off your first order: {{discountCode}}',
 '{"customer": "object", "storeName": "string", "discountCode": "string", "expiryDays": "number", "storeUrl": "string"}'),

('order-confirmation', 'Order #{{order.id}} Confirmation', 
 '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Order Confirmation</title></head><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;"><div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;"><h1 style="color: #333; text-align: center;">Order Confirmed!</h1><p>Hi {{customer.firstName}},</p><p>Thank you for your order! Here are the details:</p><div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;"><h3>Order #{{order.id}}</h3><p><strong>Status:</strong> {{order.status}}</p><p><strong>Total:</strong> {{currency order.total}}</p></div>{{#each order.items}}<div style="border-bottom: 1px solid #eee; padding: 10px 0;"><p><strong>{{name}}</strong> - {{currency price}} x {{quantity}}</p></div>{{/each}}<div style="text-align: center; margin: 30px 0;"><a href="{{storeUrl}}/orders/{{order.id}}" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Order Details</a></div><p>Thank you for shopping with {{storeName}}!</p></div></body></html>',
 'Order #{{order.id}} confirmed. Total: {{currency order.total}}',
 '{"customer": "object", "order": "object", "storeName": "string", "storeUrl": "string"}'),

('abandoned-cart-1', 'Did you forget something?', 
 '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Forgot Something?</title></head><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;"><div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;"><h1 style="color: #333; text-align: center;">Did you forget something?</h1><p>Hi {{customer.firstName}},</p><p>We noticed you left some items in your cart:</p>{{#each cart.items}}<div style="border-bottom: 1px solid #eee; padding: 10px 0;"><p><strong>{{name}}</strong> - {{currency price}} x {{quantity}}</p></div>{{/each}}<div style="text-align: center; margin: 30px 0;"><a href="{{storeUrl}}/cart" style="background-color: #ffc107; color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Return to Cart</a></div><p>Your cart total: <strong>{{currency cart.total}}</strong></p><p>Items are reserved for 24 hours.</p><p>The {{storeName}} Team</p></div></body></html>',
 'Did you forget something? Your cart total: {{currency cart.total}}',
 '{"customer": "object", "cart": "object", "storeName": "string", "storeUrl": "string"}'),

('password-reset', 'Reset your {{storeName}} password', 
 '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Password Reset</title></head><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;"><div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;"><h1 style="color: #333; text-align: center;">Reset Your Password</h1><p>Hi {{customer.firstName}},</p><p>We received a request to reset your password. Click the link below to reset it:</p><div style="text-align: center; margin: 30px 0;"><a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></div><p>This link expires in {{expiryHours}} hours.</p><p>If you didn''t request this, please ignore this email.</p><p>The {{storeName}} Team</p></div></body></html>',
 'Reset your {{storeName}} password: {{resetUrl}}',
 '{"customer": "object", "resetUrl": "string", "expiryHours": "number", "storeName": "string"}')
ON CONFLICT (name) DO NOTHING;

-- Insert default email campaigns
INSERT INTO email_campaigns (name, type, trigger_event, template_id, status, config) VALUES 
('Welcome Series - Email 1', 'welcome', 'customer.registered', 1, 'active', 
 '{"delay": 0, "priority": 1, "enabled": true}'),
('Order Confirmation', 'transactional', 'order.placed', 2, 'active', 
 '{"delay": 0, "priority": 1, "enabled": true}'),
('Abandoned Cart - Email 1', 'abandoned_cart', 'cart.abandoned', 3, 'active', 
 '{"delay": 3600000, "priority": 3, "enabled": true, "condition": "cart.total > 0"}'),
('Password Reset', 'transactional', 'password.reset', 4, 'active', 
 '{"delay": 0, "priority": 1, "enabled": true}');
