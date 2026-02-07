const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../config/database');
const auth = require('../middleware/auth');

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

// Get all users with pagination and filtering
router.get('/users', auth.authenticateAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('status').optional().isIn(['active', 'inactive', 'all']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate()
], handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      dateFrom,
      dateTo
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (search) {
      whereConditions.push(`(
        email ILIKE $${paramIndex} OR 
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status !== 'all') {
      whereConditions.push(`email_verified = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get users with order statistics
    const usersQuery = `
      SELECT 
        c.id, c.email, c.first_name, c.last_name, c.phone,
        c.email_verified, c.accepts_marketing, c.created_at, c.last_login_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        MAX(o.created_at) as last_order_date
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
      ${whereClause}
      GROUP BY c.id, c.email, c.first_name, c.last_name, c.phone, c.email_verified, c.accepts_marketing, c.created_at, c.last_login_at
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
      ${whereClause}
    `;

    const [usersResult, countResult] = await Promise.all([
      database.query(usersQuery, params),
      database.query(countQuery, params.slice(0, -2))
    ]);

    const totalUsers = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalUsers,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      code: 'GET_USERS_ERROR'
    });
  }
});

// Get user details
router.get('/users/:id', auth.authenticateAdmin, [
  param('id').isUUID()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const [
      userResult,
      ordersResult,
      addressesResult,
      preferencesResult
    ] = await Promise.all([
      // User details
      database.query(`
        SELECT 
          id, email, first_name, last_name, phone,
          email_verified, accepts_marketing, created_at, last_login_at
        FROM customers
        WHERE id = $1
      `, [id]),

      // User orders
      database.query(`
        SELECT 
          id, status, total, currency, created_at, updated_at
        FROM orders
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [id]),

      // User addresses
      database.query(`
        SELECT 
          id, type, street, city, state, postal_code, country,
          is_default, created_at
        FROM customer_addresses
        WHERE customer_id = $1
        ORDER BY is_default DESC, created_at DESC
      `, [id]),

      // User preferences
      database.query(`
        SELECT 
          email_type, is_enabled, updated_at
        FROM customer_email_preferences
        WHERE customer_id = $1
      `, [id])
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        orders: ordersResult.rows,
        addresses: addressesResult.rows,
        preferences: preferencesResult.rows
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      error: 'Failed to fetch user details',
      code: 'GET_USER_DETAILS_ERROR'
    });
  }
});

// Update user status
router.put('/users/:id/status', auth.authenticateAdmin, [
  param('id').isUUID(),
  body('status').isIn(['active', 'inactive']),
  body('reason').optional().isString()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const result = await database.query(
      'UPDATE customers SET email_verified = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, email_verified',
      [status === 'active', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Log the status change
    await database.query(
      'INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'update_user_status', 'customer', id, { status, reason }]
    );

    res.json({
      success: true,
      message: `User ${status} successfully`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      code: 'UPDATE_USER_STATUS_ERROR'
    });
  }
});

// Get all orders with advanced filtering
router.get('/orders', auth.authenticateAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'all']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
  query('minAmount').optional().isFloat({ min: 0 }),
  query('maxAmount').optional().isFloat({ min: 0 }),
  query('search').optional().isString()
], handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (status !== 'all') {
      whereConditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`o.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`o.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    if (minAmount) {
      whereConditions.push(`o.total >= $${paramIndex}`);
      params.push(minAmount);
      paramIndex++;
    }

    if (maxAmount) {
      whereConditions.push(`o.total <= $${paramIndex}`);
      params.push(maxAmount);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        o.id::text ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const ordersQuery = `
      SELECT 
        o.id, o.status, o.total, o.currency, o.created_at, o.updated_at,
        c.id as customer_id, c.email, c.first_name, c.last_name,
        COUNT(oi.id) as item_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id, c.id, c.email, c.first_name, c.last_name
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
    `;

    const [ordersResult, countResult] = await Promise.all([
      database.query(ordersQuery, params),
      database.query(countQuery, params.slice(0, -2))
    ]);

    const totalOrders = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      success: true,
      data: {
        orders: ordersResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalOrders,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      code: 'GET_ORDERS_ERROR'
    });
  }
});

// Update order status
router.put('/orders/:id/status', auth.authenticateAdmin, [
  param('id').isUUID(),
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  body('trackingNumber').optional().isString(),
  body('notes').optional().isString()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, notes } = req.body;

    // Check if order exists
    const orderResult = await database.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const oldStatus = orderResult.rows[0].status;

    // Update order status
    const updateFields = ['status = $2', 'updated_at = NOW()'];
    const updateValues = [id, status];
    let paramIndex = 3;

    if (trackingNumber) {
      updateFields.push(`tracking_number = $${paramIndex}`);
      updateValues.push(trackingNumber);
      paramIndex++;
    }

    if (notes) {
      updateFields.push(`admin_notes = $${paramIndex}`);
      updateValues.push(notes);
      paramIndex++;
    }

    const result = await database.query(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      updateValues
    );

    // Log the status change
    await database.query(
      'INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'update_order_status', 'order', id, { oldStatus, newStatus: status, trackingNumber, notes }]
    );

    // Trigger email notification for status change
    if (oldStatus !== status) {
      const emailTriggerService = require('../services/emailTriggerService');
      const customerResult = await database.query(
        'SELECT * FROM customers WHERE id = (SELECT customer_id FROM orders WHERE id = $1)',
        [id]
      );

      if (customerResult.rows.length > 0) {
        try {
          await emailTriggerService.processEvent({
            type: 'order.status_updated',
            order: result.rows[0],
            customer: customerResult.rows[0]
          });
        } catch (emailError) {
          console.error('Failed to trigger order status email:', emailError);
        }
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Failed to update order status',
      code: 'UPDATE_ORDER_STATUS_ERROR'
    });
  }
});

// Get admin activity logs
router.get('/logs', auth.authenticateAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString(),
  query('resourceType').optional().isString(),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate()
], handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resourceType,
      dateFrom,
      dateTo
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (action) {
      whereConditions.push(`action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (resourceType) {
      whereConditions.push(`resource_type = $${paramIndex}`);
      params.push(resourceType);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const logsQuery = `
      SELECT 
        al.id, al.action, al.resource_type, al.resource_id, al.details, al.created_at,
        a.email as admin_email, a.first_name, a.last_name
      FROM admin_logs al
      JOIN admins a ON al.admin_id = a.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_logs al
      ${whereClause}
    `;

    const [logsResult, countResult] = await Promise.all([
      database.query(logsQuery, params),
      database.query(countQuery, params.slice(0, -2))
    ]);

    const totalLogs = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalLogs / limit);

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalLogs,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch admin logs',
      code: 'GET_ADMIN_LOGS_ERROR'
    });
  }
});

// Get business settings
router.get('/settings', auth.authenticateAdmin, async (req, res) => {
  try {
    const result = await database.query('SELECT * FROM business_settings LIMIT 1');
    res.json({
      success: true,
      data: result.rows[0] || {}
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      code: 'GET_SETTINGS_ERROR'
    });
  }
});

module.exports = router;
