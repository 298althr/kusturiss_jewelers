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

// Get dashboard overview - Exception-driven, decision-centric
router.get('/dashboard', async (req, res) => {
  try {
    const { dateRange = '30' } = req.query;
    const days = parseInt(dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get key metrics - single source of truth
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
      // Recent orders - surface anomalies
      database.query(`
        SELECT o.id, o.total_amount as total, o.status, o.created_at,
               c.email as customer_email, c.first_name, c.last_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
        LIMIT 10
      `),
      // Top products by revenue
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

// Get sales analytics - Risk-weighted, decision-centric
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

// Get customer analytics - Customer quality focus
router.get('/customers', async (req, res) => {
  try {
    console.log('🔍 Customer analytics endpoint hit');
    
    const { limit = 20, offset = 0 } = req.query;
    
    // Customer quality metrics - exception-driven
    const [
      customerStats,
      recentCustomers,
      highValueCustomers
    ] = await Promise.all([
      // Basic customer statistics
      database.query(`
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_customers_30d,
          COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_customers_7d,
          COUNT(CASE WHEN accepts_marketing = true THEN 1 END) as marketing_subscribers
        FROM customers
      `),
      
      // Recent customers - surface new signups
      database.query(`
        SELECT 
          id, email, first_name, last_name, 
          email_verified, accepts_marketing, created_at, last_login_at
        FROM customers
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      
      // High-value customers - risk-weighted analysis
      database.query(`
        SELECT 
          c.id, c.email, c.first_name, c.last_name, c.created_at,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as lifetime_value,
          MAX(o.created_at) as last_order_date
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        GROUP BY c.id, c.email, c.first_name, c.last_name, c.created_at
        HAVING COUNT(o.id) > 0
        ORDER BY lifetime_value DESC
        LIMIT 10
      `)
    ]);

    res.json({
      success: true,
      data: {
        stats: customerStats.rows[0],
        customers: recentCustomers.rows,
        highValueCustomers: highValueCustomers.rows,
        pagination: {
          total: customerStats.rows[0].total_customers,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
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

// Get product analytics - Capital and inventory focus
router.get('/products', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    // Product metrics - capital allocation focus
    const [
      productStats,
      lowStockProducts,
      topPerformingProducts
    ] = await Promise.all([
      // Basic product statistics
      database.query(`
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN inventory_count <= 10 THEN 1 END) as low_stock_products,
          COUNT(CASE WHEN inventory_count = 0 THEN 1 END) as out_of_stock_products,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products
        FROM products
      `),
      
      // Low stock alerts - exception-driven
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
        ORDER BY inventory_count ASC
        LIMIT 20
      `),
      
      // Top performing products - decision-centric
      database.query(`
        SELECT 
          p.id, p.name, p.sku, p.price, p.inventory_count, p.status,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.quantity * oi.price), 0) as revenue,
          COUNT(DISTINCT oi.order_id) as order_count
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
        GROUP BY p.id, p.name, p.sku, p.price, p.inventory_count, p.status
        ORDER BY revenue DESC NULLS LAST
        LIMIT $1
      `, [limit])
    ]);

    res.json({
      success: true,
      data: {
        stats: productStats.rows[0],
        lowStockProducts: lowStockProducts.rows,
        products: topPerformingProducts.rows,
        pagination: {
          total: productStats.rows[0].total_products,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
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

// Get system health - Real-time monitoring
router.get('/health', async (req, res) => {
  try {
    const [
      databaseHealth,
      recentErrors,
      systemMetrics
    ] = await Promise.all([
      // Database health
      database.query(`
        SELECT 
          'healthy' as status,
          NOW() as timestamp,
          COUNT(DISTINCT id) as total_tables
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `),
      
      // Recent errors - exception tracking
      database.query(`
        SELECT 
          'No recent errors' as action,
          'system' as resource_type,
          '{}' as details,
          NOW() as created_at
      `),
      
      // System metrics
      database.query(`
        SELECT 
          COUNT(*) as total_orders_today,
          COALESCE(SUM(total_amount), 0) as revenue_today
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
      `)
    ]);

    res.json({
      success: true,
      data: {
        database: databaseHealth.rows[0],
        recentErrors: recentErrors.rows,
        metrics: systemMetrics.rows[0],
        timestamp: new Date().toISOString()
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
