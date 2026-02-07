const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🧪 Admin analytics test endpoint hit!');
  res.json({ message: 'Admin analytics test working' });
});

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

// Get dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const { dateRange = '30' } = req.query;
    const days = parseInt(dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get key metrics
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      recentOrders,
      topProducts,
      revenueByDay
    ] = await Promise.all([
      // Total orders
      database.query(
        'SELECT COUNT(*) as count FROM orders WHERE created_at >= $1',
        [startDate]
      ),
      // Total revenue
      database.query(
        'SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE created_at >= $1 AND status != $2',
        [startDate, 'cancelled']
      ),
      // Total customers
      database.query(
        'SELECT COUNT(*) as count FROM customers WHERE created_at >= $1',
        [startDate]
      ),
      // Total products
      database.query('SELECT COUNT(*) as count FROM products'),
      // Recent orders
      database.query(`
        SELECT o.id, o.total_amount as total, o.status, o.created_at,
               c.email as customer_email, c.first_name, c.last_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
        LIMIT 10
      `),
      // Top products
      database.query(`
        SELECT p.id, p.name, p.price,
               SUM(oi.quantity) as total_sold,
               SUM(oi.quantity * oi.price) as revenue
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= $1 AND o.status != $2
        GROUP BY p.id, p.name, p.price
        ORDER BY total_sold DESC
        LIMIT 5
      `, [startDate, 'cancelled']),
      // Revenue by day
      database.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= $1 AND status != $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [startDate, 'cancelled'])
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          totalOrders: parseInt(totalOrders.rows[0].count),
          totalRevenue: parseFloat(totalRevenue.rows[0].revenue),
          totalCustomers: parseInt(totalCustomers.rows[0].count),
          totalProducts: parseInt(totalProducts.rows[0].count)
        },
        recentOrders: recentOrders.rows,
        topProducts: topProducts.rows,
        revenueByDay: revenueByDay.rows
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

// Get sales analytics
router.get('/sales', async (req, res) => {
  try {
    console.log('🔍 Sales analytics endpoint hit');
    
    // Test basic orders table access
    const testQuery = await database.query('SELECT COUNT(*) as count FROM orders');
    console.log('📊 Orders count:', testQuery.rows[0].count);
    
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = 'YYYY-WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const salesData = await database.query(`
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      WHERE 1=1
        AND ($1::date IS NULL OR o.created_at >= $1::date)
        AND ($2::date IS NULL OR o.created_at <= $2::date)
        AND ($3::text IS NULL OR o.status != $3)
      GROUP BY TO_CHAR(o.created_at, '${dateFormat}')
      ORDER BY period DESC
      LIMIT 52
    `, [startDate || null, endDate || null, 'cancelled']);

    res.json({
      success: true,
      data: salesData.rows
    });

  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch sales analytics',
      code: 'SALES_ANALYTICS_ERROR'
    });
  }
});

// Get customer analytics
router.get('/customers', async (req, res) => {
  try {
    console.log('🔍 Customer analytics endpoint hit');
    
    // Test basic query
    const testQuery = await database.query('SELECT COUNT(*) as count FROM customers');
    console.log('👤 Customers count:', testQuery.rows[0].count);
    
    const { startDate, endDate, limit = 50 } = req.query;

    const [
      customerStats,
      topCustomers,
      newCustomers,
      customerRetention
    ] = await Promise.all([
      // Customer statistics
      database.query(`
        SELECT 
          COUNT(DISTINCT c.id) as unique_customers,
          COUNT(CASE WHEN c.last_login_at >= $1 THEN 1 END) as active_customers,
          COUNT(CASE WHEN c.accepts_marketing = true THEN 1 END) as marketing_subscribers,
          COUNT(CASE WHEN c.created_at >= $2::date THEN 1 END) as new_customers
        FROM customers c
        WHERE ($2::date IS NULL OR c.created_at >= $2::date)
      `, [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), startDate]),
      
      // Top customers by revenue
      database.query(`
        SELECT 
          c.id, c.email, c.first_name, c.last_name, c.created_at,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as total_revenue,
          COALESCE(AVG(o.total_amount), 0) as avg_order_value,
          MAX(o.created_at) as last_order_date
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE ($1::date IS NULL OR o.created_at IS NULL OR o.created_at >= $1::date)
          AND ($2::date IS NULL OR o.created_at IS NULL OR o.created_at <= $2::date)
          AND (o.status IS NULL OR o.status != $3)
        GROUP BY c.id, c.email, c.first_name, c.last_name, c.created_at
        ORDER BY total_revenue DESC
        LIMIT $4
      `, [startDate, endDate, 'cancelled', limit]),
      
      // New customers over time
      database.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_customers
        FROM customers
        WHERE ($1::date IS NULL OR created_at >= $1::date)
          AND ($2::date IS NULL OR created_at <= $2::date)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [startDate, endDate]),
      
      // Customer retention
      database.query(`
        WITH customer_periods AS (
          SELECT 
            customer_id,
            DATE(created_at) as first_order,
            DATE(created_at + INTERVAL '30 days') as retention_date,
            COUNT(*) as orders_in_period
          FROM orders
          WHERE status != $1
          GROUP BY customer_id, DATE(created_at)
        )
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN orders_in_period > 1 THEN 1 END) as repeat_customers,
          ROUND(
            COUNT(CASE WHEN orders_in_period > 1 THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0), 2
          ) as retention_rate
        FROM customer_periods
        WHERE ($2::date IS NULL OR first_order >= $2::date)
      `, ['cancelled', startDate])
    ]);

    res.json({
      success: true,
      data: {
        stats: customerStats.rows[0],
        topCustomers: topCustomers.rows,
        newCustomers: newCustomers.rows,
        retention: customerRetention.rows[0]
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

// Get product analytics
router.get('/products', [
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], handleValidationErrors, async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const [
      productStats,
      topProducts,
      lowStockProducts,
      categoryPerformance
    ] = await Promise.all([
      // Product statistics
      database.query(`
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN inventory_count <= 10 THEN 1 END) as low_stock_products,
          COUNT(CASE WHEN inventory_count = 0 THEN 1 END) as out_of_stock_products
        FROM products
      `),
      
      // Top products by revenue
      database.query(`
        SELECT 
          p.id, p.name, p.sku, p.price, p.inventory_count,
          SUM(oi.quantity) as total_sold,
          SUM(oi.quantity * oi.price) as revenue,
          COUNT(DISTINCT oi.order_id) as order_count
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE ($1::date IS NULL OR o.created_at >= $1::date)
          AND ($2::date IS NULL OR o.created_at <= $2::date)
          AND o.status != $3
        GROUP BY p.id, p.name, p.sku, p.price, p.inventory_count
        ORDER BY revenue DESC
        LIMIT $4
      `, [startDate, endDate, 'cancelled', limit]),
      
      // Low stock products
      database.query(`
        SELECT 
          id, name, sku, price, inventory_count,
          CASE 
            WHEN inventory_count = 0 THEN 'out_of_stock'
            WHEN inventory_count <= 5 THEN 'critical'
            WHEN inventory_count <= 10 THEN 'low'
            ELSE 'adequate'
          END as stock_status
        FROM products
        WHERE inventory_count <= 10
        ORDER BY inventory_quantity ASC
        LIMIT 20
      `),
      
      // Category performance
      database.query(`
        SELECT 
          p.category,
          COUNT(DISTINCT p.id) as product_count,
          SUM(oi.quantity) as total_sold,
          SUM(oi.quantity * oi.price) as revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE ($1::date IS NULL OR o.created_at >= $1::date)
          AND ($2::date IS NULL OR o.created_at <= $2::date)
          AND (o.status IS NULL OR o.status != $3)
          AND p.category IS NOT NULL
        GROUP BY p.category
        ORDER BY revenue DESC
      `, [startDate, endDate, 'cancelled'])
    ]);

    res.json({
      success: true,
      data: {
        stats: productStats.rows[0],
        topProducts: topProducts.rows,
        lowStockProducts: lowStockProducts.rows,
        categoryPerformance: categoryPerformance.rows
      }
    });

  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch product analytics',
      code: 'PRODUCT_ANALYTICS_ERROR'
    });
  }
});

// Get system health metrics
router.get('/health', auth.authenticateAdmin, async (req, res) => {
  try {
    const [
      databaseHealth,
      emailQueueHealth,
      recentErrors,
      systemMetrics
    ] = await Promise.all([
      // Database health
      database.query(`
        SELECT 
          NOW() as current_time,
          COUNT(*) as total_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `),
      
      // Email queue health
      database.query(`
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(CASE WHEN scheduled_at <= NOW() THEN 1 END) as ready_to_send
        FROM email_queue
        GROUP BY status
      `),
      
      // Recent errors (from logs would require logging table)
      database.query(`
        SELECT 
          COUNT(*) as error_count
        FROM email_queue
        WHERE status = 'failed'
          AND created_at >= NOW() - INTERVAL '24 hours'
      `),
      
      // System metrics
      database.query(`
        SELECT 
          (SELECT COUNT(*) FROM customers) as total_customers,
          (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
          (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '24 hours') as orders_today,
          (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '24 hours' AND status != 'cancelled') as revenue_today
      `)
    ]);

    res.json({
      success: true,
      data: {
        database: {
          status: 'healthy',
          activeConnections: parseInt(databaseHealth.rows[0].total_connections),
          timestamp: databaseHealth.rows[0].current_time
        },
        emailQueue: {
          status: 'healthy',
          queue: emailQueueHealth.rows
        },
        errors: {
          recentErrors: parseInt(recentErrors.rows[0].error_count),
          status: recentErrors.rows[0].error_count > 10 ? 'warning' : 'healthy'
        },
        metrics: systemMetrics.rows[0]
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Failed to fetch system health',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

module.exports = router;
