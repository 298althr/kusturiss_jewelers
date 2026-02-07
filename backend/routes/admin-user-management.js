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

// Get all customers with pagination and filtering
router.get('/customers', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ min: 1, max: 100 }),
  query('status').optional().isIn(['all', 'active', 'inactive']),
  query('email_verified').optional().isBoolean(),
  query('accepts_marketing').optional().isBoolean(),
  query('date_from').optional().isISO8601().toDate(),
  query('date_to').optional().isISO8601().toDate()
], handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      email_verified,
      accepts_marketing,
      date_from,
      date_to
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status !== 'all') {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(status === 'active');
      paramIndex++;
    }

    if (email_verified !== undefined) {
      whereConditions.push(`email_verified = $${paramIndex}`);
      queryParams.push(email_verified);
      paramIndex++;
    }

    if (accepts_marketing !== undefined) {
      whereConditions.push(`accepts_marketing = $${paramIndex}`);
      queryParams.push(accepts_marketing);
      paramIndex++;
    }

    if (date_from) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(date_to);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get customers
    const [customers, total] = await Promise.all([
      database.query(`
        SELECT 
          id, email, first_name, last_name, phone,
          email_verified, accepts_marketing, is_active,
          created_at, last_login_at,
          (SELECT COUNT(*) FROM orders WHERE customer_id = customers.id) as order_count,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = customers.id AND status != 'cancelled') as total_spent
        FROM customers
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]),
      
      database.query(`
        SELECT COUNT(*) as total
        FROM customers
        ${whereClause}
      `, queryParams)
    ]);

    res.json({
      success: true,
      data: {
        customers: customers.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.rows[0].total),
          totalPages: Math.ceil(total.rows[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      error: 'Failed to fetch customers',
      code: 'GET_CUSTOMERS_ERROR'
    });
  }
});

// Get customer details
router.get('/customers/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.query(`
      SELECT 
        c.id, c.email, c.first_name, c.last_name, c.phone,
        c.email_verified, c.accepts_marketing, c.is_active,
        c.created_at, c.last_login_at,
        c.email_verification_token, c.email_verification_expires,
        c.password_reset_token, c.password_reset_expires,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND status = 'delivered') as delivered_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = c.id AND status != 'cancelled') as total_spent,
        (SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE customer_id = c.id AND status = 'delivered') as avg_order_value,
        (SELECT MAX(created_at) FROM orders WHERE customer_id = c.id) as last_order_date
      FROM customers c
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Get customer's orders
    const ordersResult = await database.query(`
      SELECT 
        o.id, o.order_number, o.total_amount, o.status, o.created_at,
        o.shipped_at, o.delivered_at, o.tracking_number
      FROM orders o
      WHERE o.customer_id = $1
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [id]);

    // Get customer's sessions
    const sessionsResult = await database.query(`
      SELECT 
        session_token, ip_address, user_agent, created_at, expires_at, last_activity_at
      FROM user_sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY last_activity_at DESC
    `, [id]);

    // Get customer's activity log
    const activityResult = await database.query(`
      SELECT 
        activity_type, resource_type, resource_id, details,
        ip_address, user_agent, created_at
      FROM user_activity_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [id]);

    res.json({
      success: true,
      data: {
        customer: result.rows[0],
        orders: ordersResult.rows,
        sessions: sessionsResult.rows,
        recentActivity: activityResult.rows
      }
    });

  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({
      error: 'Failed to fetch customer details',
      code: 'GET_CUSTOMER_DETAILS_ERROR'
    });
  }
});

// Update customer status
router.put('/customers/:id/status', async (req, res) => {
  try {
    console.log('🔧 Update customer status request:', req.params.id, req.body);
    
    const { id } = req.params;
    const { is_active, reason } = req.body;
    const adminId = 'test-admin'; // Temporary for testing

    console.log('🔧 Processing update:', { id, is_active, reason });

    // Update customer status
    const result = await database.query(`
      UPDATE customers 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, first_name, last_name, is_active, updated_at
    `, [is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Log the status change
    // await database.query(`
    //   INSERT INTO admin_logs (
    //     admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
    //   ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    // `, [
    //   adminId,
    //   is_active ? 'ACTIVATE_CUSTOMER' : 'DEACTIVATE_CUSTOMER',
    //   'customer',
    //   id,
    //   JSON.stringify({ reason, previous_status: !is_active }),
    //   req.ip,
    //   req.get('User-Agent')
    // ]);

    res.json({
      success: true,
      message: `Customer ${is_active ? 'activated' : 'deactivated'} successfully`,
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({
      error: 'Failed to update customer status',
      code: 'UPDATE_CUSTOMER_STATUS_ERROR'
    });
  }
});

// Update customer marketing preferences
router.put('/customers/:id/marketing', auth.authenticateAdmin, [
  param('id').isUUID(),
  body('accepts_marketing').isBoolean(),
  body('reason').optional().trim().isLength({ max: 500 })
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { accepts_marketing, reason } = req.body;
    const adminId = req.admin.id;

    // Update marketing preferences
    const result = await database.query(`
      UPDATE customers 
      SET accepts_marketing = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, first_name, last_name, accepts_marketing, updated_at
    `, [accepts_marketing, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Log the preference change
    await database.query(`
      INSERT INTO admin_logs (
        admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      adminId,
      accepts_marketing ? 'ENABLE_MARKETING' : 'DISABLE_MARKETING',
      'customer',
      id,
      JSON.stringify({ reason }),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: `Marketing preferences updated successfully`,
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Update marketing preferences error:', error);
    res.status(500).json({
      error: 'Failed to update marketing preferences',
      code: 'UPDATE_MARKETING_PREFERENCES_ERROR'
    });
  }
});

// Get customer analytics
router.get('/customers/:id/analytics', auth.authenticateAdmin, [
  param('id').isUUID(),
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('start_date').optional().isISO8601().toDate(),
  query('end_date').optional().isISO8601().toDate()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d', start_date, end_date } = req.query;

    // Calculate date range
    let startDate, endDate;
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      endDate = new Date();
      startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
    }

    // Get customer analytics
    const [
      orderStats,
      revenueStats,
      recentOrders,
      orderTrends,
      productPreferences
    ] = await Promise.all([
      // Order statistics
      database.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_order_value
        FROM orders
        WHERE customer_id = $1
          AND created_at >= $2 AND created_at <= $3
      `, [id, startDate, endDate]),
      
      // Revenue by month
      database.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(AVG(total_amount), 0) as avg_order_value
        FROM orders
        WHERE customer_id = $1
          AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `, [id, startDate, endDate]),
      
      // Recent orders
      database.query(`
        SELECT 
          id, order_number, total_amount, status, created_at,
          shipped_at, delivered_at, tracking_number
        FROM orders
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [id]),
      
      // Order trends
      database.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE customer_id = $1
          AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [id, startDate, endDate]),
      
      // Product preferences
      database.query(`
        SELECT 
          p.name, p.category,
          COUNT(oi.id) as purchase_count,
          SUM(oi.quantity) as total_quantity,
          COALESCE(SUM(oi.quantity * oi.price), 0) as total_spent
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.customer_id = $1
          AND o.status != 'cancelled'
          AND o.created_at >= $2 AND o.created_at <= $3
        GROUP BY p.id, p.name, p.category
        ORDER BY total_spent DESC
        LIMIT 10
      `, [id, startDate, endDate])
    ]);

    // Calculate customer lifetime value
    const customerLifetimeValue = parseFloat(orderStats.rows[0].total_revenue) || 0;
    const avgOrderValue = parseFloat(orderStats.rows[0].avg_order_value) || 0;
    const repeatPurchaseRate = orderStats.rows[0].delivered_orders > 0 ? 
      (orderStats.rows[0].delivered_orders / orderStats.rows[0].total_orders) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate,
          type: period
        },
        overview: {
          totalOrders: parseInt(orderStats.rows[0].total_orders),
          deliveredOrders: parseInt(orderStats.rows[0].delivered_orders),
          pendingOrders: parseInt(orderStats.rows[0].pending_orders),
          cancelledOrders: parseInt(orderStats.rows[0].cancelled_orders),
          totalRevenue: parseFloat(orderStats.rows[0].total_revenue),
          avgOrderValue: parseFloat(orderStats.rows[0].avg_order_value),
          customerLifetimeValue,
          repeatPurchaseRate
        },
        revenueByMonth: revenueStats.rows,
        recentOrders: recentOrders.rows,
        orderTrends: orderTrends.rows,
        topProducts: productPreferences.rows
      }
    });

  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch customer analytics',
      code: 'CUSTOMER_ANALYTICS_ERROR'
    });
  }
});

// Get customer sessions
router.get('/customers/:id/sessions', auth.authenticateAdmin, [
  param('id').isUUID()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const sessions = await database.query(`
      SELECT 
        s.session_token, s.ip_address, s.user_agent, s.created_at, s.expires_at, s.last_activity_at,
        c.email, c.first_name, c.last_name
      FROM user_sessions s
      JOIN customers c ON s.user_id = c.id
      WHERE s.user_id = $1
      ORDER BY s.last_activity_at DESC
    `, [id]);

    res.json({
      success: true,
      sessions: sessions.rows.map(session => ({
        ...session,
        isActive: new Date(session.expires_at) > new Date(),
        isCurrentSession: session.last_activity_at && 
          (new Date() - new Date(session.last_activity_at)) < 5 * 60 * 1000 // Active in last 5 minutes
      }))
    });

  } catch (error) {
    console.error('Get customer sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch customer sessions',
      code: 'GET_CUSTOMER_SESSIONS_ERROR'
    });
  }
});

// Delete customer (soft delete)
router.delete('/customers/:id', auth.authenticateAdmin, [
  param('id').isUUID(),
  body('reason').trim().isLength({ min: 1, max: 500 })
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    // Soft delete customer (set is_active = false)
    const result = await database.query(`
      UPDATE customers 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, first_name, last_name, is_active
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Destroy all sessions for this customer
    await database.query(`
      DELETE FROM user_sessions WHERE user_id = $1
    `, [id]);

    // Log the deletion
    await database.query(`
      INSERT INTO admin_logs (
        admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      adminId,
      'DELETE_CUSTOMER',
      'customer',
      id,
      JSON.stringify({ reason }),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Customer deleted successfully',
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      error: 'Failed to delete customer',
      code: 'DELETE_CUSTOMER_ERROR'
    });
  }
});

module.exports = router;
