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

// Create new order
router.post('/', [
  body('customer_id').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.price').isFloat({ min: 0 }),
  body('shipping_address').isObject(),
  body('billing_address').optional().isObject(),
  body('payment_method').isIn(['stripe', 'paypal', 'cash_on_delivery']),
  body('shipping_method').isString(),
  body('shipping_cost').isFloat({ min: 0 }),
  body('tax_amount').isFloat({ min: 0 }),
  body('discount_amount').optional().isFloat({ min: 0 }),
  body('notes').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      customer_id,
      items,
      shipping_address,
      billing_address,
      payment_method,
      shipping_method,
      shipping_cost,
      tax_amount,
      discount_amount = 0,
      notes,
      is_gift = false,
      gift_message = null,
      delivery_instructions = null,
      gift_addons = []
    } = req.body;

    // Calculate total amount
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Add addon prices if any
    const addons_total = gift_addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    const total_amount = subtotal + shipping_cost + tax_amount + addons_total - discount_amount;

    // Start transaction
    const result = await database.transaction(async (client) => {
      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
          customer_id, status, subtotal, shipping_cost, tax_amount, 
          discount_amount, total_amount, payment_method, shipping_method,
          shipping_address, billing_address, notes, 
          is_gift, gift_message, delivery_instructions, gift_addons,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        RETURNING *`,
        [
          customer_id,
          'pending',
          subtotal,
          shipping_cost,
          tax_amount,
          discount_amount,
          total_amount,
          payment_method,
          shipping_method,
          JSON.stringify(shipping_address),
          JSON.stringify(billing_address || shipping_address),
          notes,
          is_gift,
          gift_message,
          delivery_instructions,
          JSON.stringify(gift_addons)
        ]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, quantity, unit_price, total_price, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            order.id,
            item.product_id,
            item.quantity,
            item.price,
            item.price * item.quantity
          ]
        );

        // Update product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Create initial order status history
      await client.query(
        `INSERT INTO order_status_history (
          order_id, status, notes, created_at
        ) VALUES ($1, $2, $3, NOW())`,
        [order.id, 'pending', 'Order created']
      );

      return order;
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: result
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Failed to create order',
      code: 'ORDER_CREATION_ERROR'
    });
  }
});

// Get order by ID
router.get('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const orderResult = await database.query(
      `SELECT o.*, c.first_name, c.last_name, c.email
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await database.query(
      `SELECT oi.*, p.name as product_name, p.sku
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Get order status history
    const historyResult = await database.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      order: {
        ...order,
        items: itemsResult.rows,
        status_history: historyResult.rows
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: 'Failed to get order',
      code: 'ORDER_GET_ERROR'
    });
  }
});

// Get customer orders
router.get('/customer/:customer_id', [
  param('customer_id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE o.customer_id = $1';
    const params = [customer_id];

    if (status) {
      whereClause += ' AND o.status = $2';
      params.push(status);
    }

    // Get orders
    const ordersResult = await database.query(
      `SELECT o.*, 
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await database.query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );

    res.json({
      orders: ordersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      error: 'Failed to get customer orders',
      code: 'CUSTOMER_ORDERS_ERROR'
    });
  }
});

// Update order status
router.put('/:id/status', [
  param('id').isUUID(),
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  body('notes').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Update order status
    const result = await database.transaction(async (client) => {
      const orderResult = await client.query(
        `UPDATE orders 
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      // Add to status history
      await client.query(
        `INSERT INTO order_status_history (
          order_id, status, notes, created_at
        ) VALUES ($1, $2, $3, NOW())`,
        [id, status, notes || `Status changed to ${status}`]
      );

      return orderResult.rows[0];
    });

    res.json({
      message: 'Order status updated successfully',
      order: result
    });

  } catch (error) {
    console.error('Update order status error:', error);
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }
    res.status(500).json({
      error: 'Failed to update order status',
      code: 'ORDER_STATUS_UPDATE_ERROR'
    });
  }
});

// Cancel order
router.post('/:id/cancel', [
  param('id').isUUID(),
  body('reason').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await database.transaction(async (client) => {
      // Get order details
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      // Check if order can be cancelled
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new Error('Order cannot be cancelled in current status');
      }

      // Update order status
      await client.query(
        `UPDATE orders 
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      // Restore product stock
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Add to status history
      await client.query(
        `INSERT INTO order_status_history (
          order_id, status, notes, created_at
        ) VALUES ($1, $2, $3, NOW())`,
        [id, 'cancelled', reason || 'Order cancelled by customer']
      );

      return order;
    });

    res.json({
      message: 'Order cancelled successfully',
      order: result
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }
    if (error.message === 'Order cannot be cancelled in current status') {
      return res.status(400).json({
        error: error.message,
        code: 'ORDER_NOT_CANCELLABLE'
      });
    }
    res.status(500).json({
      error: 'Failed to cancel order',
      code: 'ORDER_CANCEL_ERROR'
    });
  }
});

const shippingService = require('../services/shippingService');

// Generate shipping label
router.post('/:id/shipping-label', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const orderResult = await database.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const order = orderResult.rows[0];

    // Simulate label generation
    const labelData = await shippingService.createShipment({
      orderId: order.id,
      toAddress: order.shipping_address,
      weight: 1.5 // Mock weight
    });

    // Update order with tracking info
    await database.query(
      'UPDATE orders SET status = $1, tracking_number = $2, updated_at = NOW() WHERE id = $3',
      ['shipped', labelData.tracking_number, id]
    );

    res.json({
      message: 'Shipping label generated successfully',
      tracking_number: labelData.tracking_number,
      label_url: labelData.label_url
    });

  } catch (error) {
    console.error('Shipping label generation error:', error);
    res.status(500).json({
      error: 'Failed to generate shipping label',
      code: 'SHIPPING_LABEL_ERROR'
    });
  }
});

module.exports = router;
