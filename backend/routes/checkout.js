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

// Get checkout information
router.get('/info', [
  body('session_id').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const sessionId = req.headers['x-cart-session'] || req.body.session_id;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Cart session ID required',
        code: 'SESSION_ID_REQUIRED'
      });
    }

    // Get cart items with product details
    const cartResult = await database.query(
      `SELECT ci.*, p.name, p.sku, p.price, p.stock, p.weight, p.track_inventory,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.session_id = $1
       ORDER BY ci.created_at`,
      [sessionId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Cart is empty',
        code: 'EMPTY_CART'
      });
    }

    // Check stock availability
    const outOfStockItems = cartResult.rows.filter(item => 
      item.track_inventory && item.stock < item.quantity
    );

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        error: 'Some items are out of stock',
        code: 'OUT_OF_STOCK',
        items: outOfStockItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          requested_quantity: item.quantity,
          available_stock: item.stock
        }))
      });
    }

    // Calculate totals
    const subtotal = cartResult.rows.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    const total_items = cartResult.rows.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);

    // Get tax rates
    const taxResult = await database.query(
      'SELECT rate FROM tax_rates WHERE is_default = true LIMIT 1'
    );

    const taxRate = taxResult.rows.length > 0 ? parseFloat(taxResult.rows[0].rate) : 0.08;
    const tax_amount = subtotal * taxRate;

    // Get shipping zones and rates
    const shippingZonesResult = await database.query(
      'SELECT * FROM shipping_zones WHERE is_active = true ORDER BY name'
    );

    // Get available payment methods
    const paymentMethods = await database.query(
      'SELECT * FROM system_settings WHERE key LIKE \'payment_%\' AND value = \'true\''
    );

    res.json({
      cart: {
        items: cartResult.rows,
        summary: {
          total_items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax_amount: parseFloat(tax_amount.toFixed(2))
        }
      },
      shipping_zones: shippingZonesResult.rows,
      payment_methods: paymentMethods.rows.map(row => row.key.replace('payment_', '')),
      tax_rate: taxRate
    });

  } catch (error) {
    console.error('Get checkout info error:', error);
    res.status(500).json({
      error: 'Failed to get checkout information',
      code: 'CHECKOUT_INFO_ERROR'
    });
  }
});

// Calculate shipping cost
router.post('/shipping', [
  body('session_id').isUUID(),
  body('shipping_zone_id').isUUID(),
  body('shipping_method').isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { session_id, shipping_zone_id, shipping_method } = req.body;

    // Get cart total weight
    const cartResult = await database.query(
      `SELECT ci.*, p.weight
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.session_id = $1`,
      [session_id]
    );

    const totalWeight = cartResult.rows.reduce((sum, item) => {
      return sum + ((item.weight || 0) * item.quantity);
    }, 0);

    // Get shipping rate
    const shippingRateResult = await database.query(
      `SELECT sr.*, sz.name as zone_name
       FROM shipping_rates sr
       JOIN shipping_zones sz ON sr.zone_id = sz.id
       WHERE sr.zone_id = $1 AND sr.method = $2 AND sr.is_active = true
       ORDER BY sr.min_weight DESC
       LIMIT 1`,
      [shipping_zone_id, shipping_method]
    );

    if (shippingRateResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Shipping method not available for this zone',
        code: 'SHIPPING_UNAVAILABLE'
      });
    }

    const shippingRate = shippingRateResult.rows[0];
    let shipping_cost = shippingRate.base_price;

    // Calculate weight-based cost
    if (totalWeight > shippingRate.min_weight) {
      const additionalWeight = totalWeight - shippingRate.min_weight;
      const additionalCost = Math.ceil(additionalWeight / shippingRate.weight_increment) * shippingRate.price_per_weight;
      shipping_cost += additionalCost;
    }

    res.json({
      shipping_cost: parseFloat(shipping_cost.toFixed(2)),
      shipping_method: shipping_method,
      zone_name: shippingRate.zone_name,
      estimated_delivery: shippingRate.estimated_delivery
    });

  } catch (error) {
    console.error('Calculate shipping error:', error);
    res.status(500).json({
      error: 'Failed to calculate shipping',
      code: 'SHIPPING_CALCULATION_ERROR'
    });
  }
});

// Apply discount code
router.post('/discount', [
  body('session_id').isUUID(),
  body('discount_code').trim().isLength({ min: 1 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { session_id, discount_code } = req.body;

    // Get cart subtotal
    const cartResult = await database.query(
      `SELECT SUM(ci.unit_price * ci.quantity) as subtotal
       FROM cart_items ci
       WHERE ci.session_id = $1`,
      [session_id]
    );

    const subtotal = parseFloat(cartResult.rows[0].subtotal) || 0;

    // Validate discount code
    const codeResult = await database.query(
      `SELECT oc.*, o.* 
       FROM offer_codes oc
       JOIN offers o ON oc.offer_id = o.id
       WHERE oc.code = $1 AND oc.status = 'active' AND o.status = 'active'`,
      [discount_code.toUpperCase()]
    );

    if (codeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invalid discount code',
        code: 'INVALID_CODE'
      });
    }

    const offerCode = codeResult.rows[0];
    const offer = offerCode;

    // Check if offer is still valid
    const now = new Date();
    if (offer.start_date > now || (offer.end_date && offer.end_date < now)) {
      return res.status(400).json({
        error: 'Discount code has expired',
        code: 'EXPIRED_CODE'
      });
    }

    // Check minimum amount requirement
    if (offer.minimum_amount > 0 && subtotal < offer.minimum_amount) {
      return res.status(400).json({
        error: `Minimum order amount of $${offer.minimum_amount} required`,
        code: 'MINIMUM_AMOUNT_NOT_MET'
      });
    }

    // Calculate discount
    let discount_amount = 0;

    if (offer.type === 'percentage') {
      discount_amount = subtotal * (offer.value / 100);
    } else if (offer.type === 'fixed_amount') {
      discount_amount = Math.min(offer.value, subtotal);
    } else if (offer.type === 'free_shipping') {
      discount_amount = 0; // Will be handled separately
    }

    res.json({
      valid: true,
      discount: {
        id: offer.id,
        name: offer.name,
        type: offer.type,
        value: offer.value,
        discount_amount: parseFloat(discount_amount.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({
      error: 'Failed to apply discount',
      code: 'DISCOUNT_APPLY_ERROR'
    });
  }
});

// Create checkout session (for Stripe)
router.post('/create-session', [
  body('session_id').isUUID(),
  body('customer_id').optional().isUUID(),
  body('shipping_address').isObject(),
  body('billing_address').optional().isObject(),
  body('shipping_method').isString(),
  body('shipping_cost').isFloat({ min: 0 }),
  body('discount_code').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      session_id,
      customer_id,
      shipping_address,
      billing_address,
      shipping_method,
      shipping_cost,
      discount_code
    } = req.body;

    // Get cart items
    const cartResult = await database.query(
      `SELECT ci.*, p.name, p.sku, p.price, p.stock, p.track_inventory
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.session_id = $1`,
      [session_id]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Cart is empty',
        code: 'EMPTY_CART'
      });
    }

    // Check stock availability
    const outOfStockItems = cartResult.rows.filter(item => 
      item.track_inventory && item.stock < item.quantity
    );

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        error: 'Some items are out of stock',
        code: 'OUT_OF_STOCK',
        items: outOfStockItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          requested_quantity: item.quantity,
          available_stock: item.stock
        }))
      });
    }

    // Calculate totals
    const subtotal = cartResult.rows.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    // Get tax
    const taxResult = await database.query(
      'SELECT rate FROM tax_rates WHERE is_default = true LIMIT 1'
    );
    const taxRate = taxResult.rows.length > 0 ? parseFloat(taxResult.rows[0].rate) : 0.08;
    let tax_amount = subtotal * taxRate;

    // Apply discount if provided
    let discount_amount = 0;
    let discount_id = null;

    if (discount_code) {
      const discountResult = await database.query(
        `SELECT oc.*, o.* 
         FROM offer_codes oc
         JOIN offers o ON oc.offer_id = o.id
         WHERE oc.code = $1 AND oc.status = 'active' AND o.status = 'active'`,
        [discount_code.toUpperCase()]
      );

      if (discountResult.rows.length > 0) {
        const offer = discountResult.rows[0];
        discount_id = offer.id;

        if (offer.type === 'percentage') {
          discount_amount = subtotal * (offer.value / 100);
        } else if (offer.type === 'fixed_amount') {
          discount_amount = Math.min(offer.value, subtotal);
        }

        // Recalculate tax on discounted amount
        const discounted_subtotal = subtotal - discount_amount;
        tax_amount = discounted_subtotal * taxRate;
      }
    }

    const total_amount = subtotal + tax_amount + shipping_cost - discount_amount;

    // Create checkout session record
    const checkoutResult = await database.query(
      `INSERT INTO checkout_sessions (
        session_id, customer_id, shipping_address, billing_address,
        shipping_method, shipping_cost, tax_amount, discount_amount,
        discount_id, subtotal, total_amount, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`,
      [
        session_id,
        customer_id,
        JSON.stringify(shipping_address),
        JSON.stringify(billing_address || shipping_address),
        shipping_method,
        shipping_cost,
        tax_amount,
        discount_amount,
        discount_id,
        subtotal,
        total_amount,
        'pending'
      ]
    );

    const checkoutSession = checkoutResult.rows[0];

    res.json({
      checkout_session: {
        id: checkoutSession.id,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_amount: parseFloat(tax_amount.toFixed(2)),
        shipping_cost: parseFloat(shipping_cost.toFixed(2)),
        discount_amount: parseFloat(discount_amount.toFixed(2)),
        total_amount: parseFloat(total_amount.toFixed(2)),
        status: checkoutSession.status
      }
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      code: 'CHECKOUT_SESSION_ERROR'
    });
  }
});

// Complete checkout (create order)
router.post('/complete', [
  body('checkout_session_id').isUUID(),
  body('payment_method').isIn(['stripe', 'paypal', 'cash_on_delivery']),
  body('payment_intent_id').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      checkout_session_id,
      payment_method,
      payment_intent_id
    } = req.body;

    // Get checkout session
    const checkoutResult = await database.query(
      'SELECT * FROM checkout_sessions WHERE id = $1 AND status = $2',
      [checkout_session_id, 'pending']
    );

    if (checkoutResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Checkout session not found or already processed',
        code: 'CHECKOUT_SESSION_NOT_FOUND'
      });
    }

    const checkoutSession = checkoutResult.rows[0];

    // Get cart items
    const cartResult = await database.query(
      `SELECT ci.*, p.name, p.sku, p.price, p.stock, p.track_inventory
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.session_id = $1`,
      [checkoutSession.session_id]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Cart is empty',
        code: 'EMPTY_CART'
      });
    }

    // Create order
    const order = await database.transaction(async (client) => {
      // Create order record
      const orderResult = await client.query(
        `INSERT INTO orders (
          customer_id, status, subtotal, shipping_cost, tax_amount,
          discount_amount, total_amount, payment_method, shipping_method,
          shipping_address, billing_address, payment_intent_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          checkoutSession.customer_id,
          payment_method === 'cash_on_delivery' ? 'confirmed' : 'pending',
          checkoutSession.subtotal,
          checkoutSession.shipping_cost,
          checkoutSession.tax_amount,
          checkoutSession.discount_amount,
          checkoutSession.total_amount,
          payment_method,
          checkoutSession.shipping_method,
          checkoutSession.shipping_address,
          checkoutSession.billing_address,
          payment_intent_id
        ]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of cartResult.rows) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, quantity, unit_price, total_price, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            order.id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.unit_price * item.quantity
          ]
        );

        // Update product stock
        if (item.track_inventory) {
          await client.query(
            'UPDATE products SET stock = stock - $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }

      // Create order status history
      await client.query(
        `INSERT INTO order_status_history (
          order_id, status, notes, created_at
        ) VALUES ($1, $2, $3, NOW())`,
        [order.id, order.status, 'Order created']
      );

      // Record discount usage if applicable
      if (checkoutSession.discount_id && checkoutSession.customer_id) {
        await client.query(
          `INSERT INTO offer_usage (
            offer_id, customer_id, order_id, discount_amount, used_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            checkoutSession.discount_id,
            checkoutSession.customer_id,
            order.id,
            checkoutSession.discount_amount
          ]
        );
      }

      // Update checkout session status
      await client.query(
        'UPDATE checkout_sessions SET status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', checkout_session_id]
      );

      // Clear cart
      await client.query(
        'DELETE FROM cart_items WHERE session_id = $1',
        [checkoutSession.session_id]
      );

      return order;
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        customer_id: order.customer_id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at
      }
    });

  } catch (error) {
    console.error('Complete checkout error:', error);
    res.status(500).json({
      error: 'Failed to complete checkout',
      code: 'CHECKOUT_COMPLETE_ERROR'
    });
  }
});

module.exports = router;
