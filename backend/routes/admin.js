const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// Generate JWT tokens for admin
const generateAdminTokens = (admin) => {
  const accessToken = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      type: 'admin',
      role: admin.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: admin.id, type: 'admin' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Admin login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const { admin, tokens } = await auth.loginAdmin(email, password, ip);

    res.json({
      message: 'Login successful',
      admin,
      tokens
    });
  } catch (error) {
    res.status(401).json({
      error: error.message,
      code: 'LOGIN_ERROR'
    });
  }
});

// Standalone Analytics Route for Dashboard
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Auth required' });

    // Simple verification for demo
    const [
      revenueResult,
      ordersResult,
      customersResult,
      recentOrdersResult
    ] = await Promise.all([
      database.query("SELECT SUM(total_amount) as total FROM orders"),
      database.query("SELECT COUNT(*) as count FROM orders"),
      database.query("SELECT COUNT(*) as count FROM customers"),
      database.query(`
        SELECT o.id, o.total_amount as total, o.status, o.created_at,
               c.first_name, c.last_name, c.email as customer_email
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC LIMIT 5
      `)
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          totalRevenue: parseFloat(revenueResult.rows[0].total || 0),
          totalOrders: parseInt(ordersResult.rows[0].count || 0),
          totalCustomers: parseInt(customersResult.rows[0].count || 0)
        },
        recentOrders: recentOrdersResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    // Get various dashboard statistics
    const [
      revenueResult,
      ordersResult,
      customersResult,
      productsResult,
      recentOrdersResult
    ] = await Promise.all([
      // Total revenue
      database.query(
        'SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status NOT IN (\'cancelled\', \'refunded\')'
      ),
      // Total orders
      database.query(
        'SELECT COUNT(*) as total_orders FROM orders'
      ),
      // Total customers
      database.query(
        'SELECT COUNT(*) as total_customers FROM customers'
      ),
      // Total products
      database.query(
        'SELECT COUNT(*) as total_products FROM products'
      ),
      // Recent orders
      database.query(
        `SELECT o.id, o.total_amount, o.status, o.created_at,
                c.first_name, c.last_name, c.email
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         ORDER BY o.created_at DESC
         LIMIT 5`
      )
    ]);

    // Get monthly revenue for the last 12 months
    const monthlyRevenueResult = await database.query(
      `SELECT 
         DATE_TRUNC('month', created_at) as month,
         SUM(total_amount) as revenue,
         COUNT(*) as orders
       FROM orders 
       WHERE created_at >= NOW() - INTERVAL '12 months'
         AND status NOT IN ('cancelled', 'refunded')
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`
    );

    // Get top products
    const topProductsResult = await database.query(
      `SELECT p.id, p.name, p.price,
         SUM(oi.quantity) as total_sold,
         SUM(oi.total_price) as total_revenue
       FROM products p
       JOIN order_items oi ON p.id = oi.product_id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status NOT IN ('cancelled', 'refunded')
       GROUP BY p.id, p.name, p.price
       ORDER BY total_sold DESC
       LIMIT 10`
    );

    res.json({
      stats: {
        total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
        total_orders: parseInt(ordersResult.rows[0].total_orders),
        total_customers: parseInt(customersResult.rows[0].total_customers),
        total_products: parseInt(productsResult.rows[0].total_products)
      },
      monthly_revenue: monthlyRevenueResult.rows,
      top_products: topProductsResult.rows,
      recent_orders: recentOrdersResult.rows
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard stats',
      code: 'DASHBOARD_ERROR'
    });
  }
});

// Get all customers (admin)
router.get('/customers', async (req, res) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)';
      params.push(`%${search}%`);
    }

    const customersResult = await database.query(
      `SELECT id, email, first_name, last_name, phone, email_verified, created_at
       FROM customers
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await database.query(
      `SELECT COUNT(*) as total FROM customers ${whereClause}`,
      params
    );

    res.json({
      customers: customersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      error: 'Failed to get customers',
      code: 'CUSTOMERS_ERROR'
    });
  }
});

// Get all orders (admin)
router.get('/orders', async (req, res) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE o.status = $1';
      params.push(status);
    }

    if (search) {
      const searchIndex = params.length + 1;
      whereClause = whereClause ?
        `${whereClause} AND (c.first_name ILIKE $${searchIndex} OR c.last_name ILIKE $${searchIndex} OR c.email ILIKE $${searchIndex} OR o.id::text ILIKE $${searchIndex})` :
        `WHERE c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.email ILIKE $1 OR o.id::text ILIKE $1`;
      params.push(`%${search}%`);
    }

    const ordersResult = await database.query(
      `SELECT o.*, c.first_name, c.last_name, c.email,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await database.query(
      `SELECT COUNT(*) as total FROM orders o JOIN customers c ON o.customer_id = c.id ${whereClause}`,
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
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to get orders',
      code: 'ORDERS_ERROR'
    });
  }
});

// Get business settings
router.get('/settings', async (req, res) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    const result = await database.query('SELECT * FROM business_settings ORDER BY key');

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({ settings });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Failed to get settings',
      code: 'SETTINGS_ERROR'
    });
  }
});

// Update business settings
router.put('/settings', [
  body('settings').isObject(),
], handleValidationErrors, async (req, res) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    const { settings } = req.body;

    await database.transaction(async (client) => {
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO business_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) 
           DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }
    });

    res.json({
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      code: 'SETTINGS_UPDATE_ERROR'
    });
  }
});

module.exports = router;
