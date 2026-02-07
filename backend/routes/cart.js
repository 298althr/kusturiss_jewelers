const express = require('express');
const { body, param, validationResult } = require('express-validator');
const database = require('../config/database');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Generate or get cart session
const getCartSession = async (req) => {
  let sessionId = req.headers['x-cart-session'] || req.body.session_id;
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create new cart session
    await database.query(
      'INSERT INTO cart_sessions (id, created_at, updated_at) VALUES ($1, NOW(), NOW())',
      [sessionId]
    );
  }

  // Check if session exists, create if not
  const sessionResult = await database.query(
    'SELECT id FROM cart_sessions WHERE id = $1',
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    await database.query(
      'INSERT INTO cart_sessions (id, created_at, updated_at) VALUES ($1, NOW(), NOW())',
      [sessionId]
    );
  }

  return sessionId;
};

// Get cart contents
router.get('/', async (req, res) => {
  try {
    const sessionId = await getCartSession(req);

    const cartResult = await database.query(
      `SELECT ci.*, p.name, p.sku, p.price, p.stock,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.session_id = $1
       ORDER BY ci.created_at`,
      [sessionId]
    );

    // Calculate cart totals
    const subtotal = cartResult.rows.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    const total_items = cartResult.rows.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);

    res.json({
      session_id: sessionId,
      items: cartResult.rows,
      summary: {
        total_items,
        subtotal: parseFloat(subtotal.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      error: 'Failed to get cart',
      code: 'CART_GET_ERROR'
    });
  }
});

// Add item to cart
router.post('/add', [
  body('product_id').isUUID(),
  body('quantity').isInt({ min: 1 }),
  body('variant_id').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { product_id, quantity, variant_id } = req.body;
    const sessionId = await getCartSession(req);

    // Check if product exists and has sufficient stock
    const productResult = await database.query(
      'SELECT id, name, price, stock, track_inventory FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    const product = productResult.rows[0];

    if (product.track_inventory && product.stock < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        code: 'INSUFFICIENT_STOCK',
        available_stock: product.stock
      });
    }

    // Check if item already exists in cart
    const existingItemResult = await database.query(
      'SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2 AND COALESCE(variant_id, \'\') = COALESCE($3, \'\')',
      [sessionId, product_id, variant_id || '']
    );

    if (existingItemResult.rows.length > 0) {
      // Update existing item quantity
      const existingItem = existingItemResult.rows[0];
      const newQuantity = existingItem.quantity + quantity;

      if (product.track_inventory && product.stock < newQuantity) {
        return res.status(400).json({
          error: 'Insufficient stock for requested quantity',
          code: 'INSUFFICIENT_STOCK',
          available_stock: product.stock
        });
      }

      await database.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQuantity, existingItem.id]
      );

    } else {
      // Add new item to cart
      await database.query(
        `INSERT INTO cart_items (
          session_id, product_id, variant_id, quantity, unit_price, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [sessionId, product_id, variant_id, quantity, product.price]
      );
    }

    // Update cart session timestamp
    await database.query(
      'UPDATE cart_sessions SET updated_at = NOW() WHERE id = $1',
      [sessionId]
    );

    res.json({
      message: 'Item added to cart successfully',
      session_id: sessionId
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      error: 'Failed to add item to cart',
      code: 'CART_ADD_ERROR'
    });
  }
});

// Update cart item quantity
router.put('/update', [
  body('item_id').isUUID(),
  body('quantity').isInt({ min: 1 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { item_id, quantity } = req.body;
    const sessionId = await getCartSession(req);

    // Get cart item with product info
    const itemResult = await database.query(
      `SELECT ci.id, ci.quantity, ci.product_id, p.stock, p.track_inventory
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = $1 AND ci.session_id = $2`,
      [item_id, sessionId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart item not found',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    const item = itemResult.rows[0];

    if (item.track_inventory && item.stock < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        code: 'INSUFFICIENT_STOCK',
        available_stock: item.stock
      });
    }

    // Update item quantity
    await database.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [quantity, item_id]
    );

    // Update cart session timestamp
    await database.query(
      'UPDATE cart_sessions SET updated_at = NOW() WHERE id = $1',
      [sessionId]
    );

    res.json({
      message: 'Cart item updated successfully'
    });

  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      error: 'Failed to update cart item',
      code: 'CART_UPDATE_ERROR'
    });
  }
});

// Remove item from cart
router.delete('/remove/:item_id', [
  param('item_id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { item_id } = req.params;
    const sessionId = await getCartSession(req);

    const result = await database.query(
      'DELETE FROM cart_items WHERE id = $1 AND session_id = $2 RETURNING id',
      [item_id, sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart item not found',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    // Update cart session timestamp
    await database.query(
      'UPDATE cart_sessions SET updated_at = NOW() WHERE id = $1',
      [sessionId]
    );

    res.json({
      message: 'Item removed from cart successfully'
    });

  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({
      error: 'Failed to remove item from cart',
      code: 'CART_REMOVE_ERROR'
    });
  }
});

// Clear cart
router.delete('/clear', async (req, res) => {
  try {
    const sessionId = await getCartSession(req);

    await database.query(
      'DELETE FROM cart_items WHERE session_id = $1',
      [sessionId]
    );

    // Update cart session timestamp
    await database.query(
      'UPDATE cart_sessions SET updated_at = NOW() WHERE id = $1',
      [sessionId]
    );

    res.json({
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      error: 'Failed to clear cart',
      code: 'CART_CLEAR_ERROR'
    });
  }
});

// Merge cart (when user logs in)
router.post('/merge', [
  body('guest_session_id').isUUID(),
  body('customer_id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { guest_session_id, customer_id } = req.body;

    // Get guest cart items
    const guestItemsResult = await database.query(
      'SELECT * FROM cart_items WHERE session_id = $1',
      [guest_session_id]
    );

    if (guestItemsResult.rows.length === 0) {
      return res.json({
        message: 'No items to merge'
      });
    }

    // Get or create customer cart session
    let customerSessionResult = await database.query(
      'SELECT id FROM cart_sessions WHERE customer_id = $1',
      [customer_id]
    );

    let customerSessionId;
    if (customerSessionResult.rows.length === 0) {
      customerSessionId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await database.query(
        'INSERT INTO cart_sessions (id, customer_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        [customerSessionId, customer_id]
      );
    } else {
      customerSessionId = customerSessionResult.rows[0].id;
    }

    // Merge items
    await database.transaction(async (client) => {
      for (const guestItem of guestItemsResult.rows) {
        // Check if item already exists in customer cart
        const existingItemResult = await client.query(
          'SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2 AND COALESCE(variant_id, \'\') = COALESCE($3, \'\')',
          [customerSessionId, guestItem.product_id, guestItem.variant_id || '']
        );

        if (existingItemResult.rows.length > 0) {
          // Update existing item quantity
          const existingItem = existingItemResult.rows[0];
          const newQuantity = existingItem.quantity + guestItem.quantity;

          // Check stock availability
          const stockResult = await client.query(
            'SELECT stock, track_inventory FROM products WHERE id = $1',
            [guestItem.product_id]
          );
          const product = stockResult.rows[0];

          if (product.track_inventory && product.stock < newQuantity) {
            // Set to maximum available stock
            await client.query(
              'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
              [product.stock, existingItem.id]
            );
          } else {
            await client.query(
              'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
              [newQuantity, existingItem.id]
            );
          }
        } else {
          // Add new item to customer cart
          await client.query(
            `INSERT INTO cart_items (
              session_id, product_id, variant_id, quantity, unit_price, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [customerSessionId, guestItem.product_id, guestItem.variant_id, guestItem.quantity, guestItem.unit_price]
          );
        }
      }

      // Clear guest cart
      await client.query(
        'DELETE FROM cart_items WHERE session_id = $1',
        [guest_session_id]
      );
    });

    res.json({
      message: 'Cart merged successfully',
      session_id: customerSessionId
    });

  } catch (error) {
    console.error('Merge cart error:', error);
    res.status(500).json({
      error: 'Failed to merge cart',
      code: 'CART_MERGE_ERROR'
    });
  }
});

// Get cart summary for checkout
router.get('/summary', async (req, res) => {
  try {
    const sessionId = await getCartSession(req);

    const cartResult = await database.query(
      `SELECT ci.*, p.name, p.sku, p.price, p.stock, p.weight,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.session_id = $1
       ORDER BY ci.created_at`,
      [sessionId]
    );

    if (cartResult.rows.length === 0) {
      return res.json({
        items: [],
        summary: {
          total_items: 0,
          subtotal: 0,
          estimated_tax: 0,
          estimated_shipping: 0,
          total: 0
        }
      });
    }

    const subtotal = cartResult.rows.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    const total_items = cartResult.rows.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);

    // Get tax rates (simplified - in real implementation, this would be more complex)
    const taxResult = await database.query(
      'SELECT rate FROM tax_rates WHERE is_default = true LIMIT 1'
    );

    const taxRate = taxResult.rows.length > 0 ? parseFloat(taxResult.rows[0].rate) : 0.08;
    const estimated_tax = subtotal * taxRate;

    // Get shipping estimate (simplified)
    const totalWeight = cartResult.rows.reduce((sum, item) => {
      return sum + ((item.weight || 0) * item.quantity);
    }, 0);

    const estimated_shipping = totalWeight > 0 ? Math.max(9.99, totalWeight * 0.5) : 0;

    const total = subtotal + estimated_tax + estimated_shipping;

    res.json({
      items: cartResult.rows,
      summary: {
        total_items,
        subtotal: parseFloat(subtotal.toFixed(2)),
        estimated_tax: parseFloat(estimated_tax.toFixed(2)),
        estimated_shipping: parseFloat(estimated_shipping.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      error: 'Failed to get cart summary',
      code: 'CART_SUMMARY_ERROR'
    });
  }
});

module.exports = router;
