const express = require('express');
const database = require('../config/database');

const router = express.Router();

// Get dashboard overview (simplified version)
router.get('/dashboard', async (req, res) => {
  try {
    // Get basic metrics
    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      recentOrders
    ] = await Promise.all([
      // Total orders
      database.query('SELECT COUNT(*) as count FROM orders'),
      // Total customers
      database.query('SELECT COUNT(*) as count FROM customers'),
      // Total products
      database.query('SELECT COUNT(*) as count FROM products'),
      // Recent orders
      database.query(`
        SELECT 
          o.id, o.order_number, o.total_amount, o.status, o.created_at,
          c.email as customer_email, c.first_name, c.last_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `)
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          totalOrders: parseInt(totalOrders.rows[0].count),
          totalCustomers: parseInt(totalCustomers.rows[0].count),
          totalProducts: parseInt(totalProducts.rows[0].count)
        },
        recentOrders: recentOrders.rows
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      code: 'DASHBOARD_ERROR'
    });
  }
});

// Get basic sales data
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (startDate) {
      dateFilter += ' AND o.created_at >= $1';
      params.push(startDate);
    }
    
    if (endDate) {
      dateFilter += ' AND o.created_at <= $2';
      params.push(endDate);
    }

    const salesData = await database.query(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);

    res.json({
      success: true,
      data: salesData.rows
    });

  } catch (error) {
    console.error('Sales data error:', error);
    res.status(500).json({
      error: 'Failed to fetch sales data',
      code: 'SALES_ERROR'
    });
  }
});

// Get customer data
router.get('/customers', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const customers = await database.query(`
      SELECT 
        id, email, first_name, last_name, 
        email_verified, accepts_marketing, created_at, last_login_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const total = await database.query('SELECT COUNT(*) as count FROM customers');

    res.json({
      success: true,
      data: {
        customers: customers.rows,
        pagination: {
          total: parseInt(total.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({
      error: 'Failed to fetch customers',
      code: 'CUSTOMERS_ERROR'
    });
  }
});

// Get order data
router.get('/orders', async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    
    let statusFilter = '';
    let params = [limit, offset];
    
    if (status && status !== 'all') {
      statusFilter = 'WHERE o.status = $3';
      params.push(status);
    }

    const orders = await database.query(`
      SELECT 
        o.id, o.order_number, o.total_amount, o.status, o.created_at,
        c.email as customer_email, c.first_name, c.last_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${statusFilter}
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const total = await database.query('SELECT COUNT(*) as count FROM orders');

    res.json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          total: parseInt(total.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      code: 'ORDERS_ERROR'
    });
  }
});

module.exports = router;
