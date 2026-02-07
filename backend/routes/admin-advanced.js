const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../config/database');
const auth = require('../middleware/auth');
const fraudDetection = require('../services/fraudDetection');
const adminSecurity = require('../services/adminSecurity');
const capitalControl = require('../services/capitalControl');

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

// ==================== FRAUD & RISK MANAGEMENT ====================

// Get fraud dashboard - Exception-driven fraud monitoring
router.get('/fraud/dashboard', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let timeFilter = '';
    switch (period) {
      case '1h': timeFilter = '1 hour'; break;
      case '24h': timeFilter = '24 hours'; break;
      case '7d': timeFilter = '7 days'; break;
      case '30d': timeFilter = '30 days'; break;
      default: timeFilter = '24 hours';
    }

    const [
      fraudStats,
      highRiskOrders,
      suspiciousActivities,
      fraudTrends
    ] = await Promise.all([
      // Fraud statistics
      database.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN requires_manual_review = true THEN 1 END) as flagged_orders,
          COUNT(CASE WHEN fraud_level = 'CRITICAL' THEN 1 END) as critical_orders,
          COUNT(CASE WHEN fraud_level = 'HIGH' THEN 1 END) as high_risk_orders,
          AVG(fraud_score) as avg_fraud_score
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${timeFilter}'
      `),
      
      // High risk orders requiring review
      database.query(`
        SELECT 
          o.id, o.order_number, o.total_amount, o.fraud_score, o.fraud_level,
          c.email as customer_email, c.first_name, c.last_name,
          o.created_at, o.ip_address
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.requires_manual_review = true
          AND o.fraud_reviewed_at IS NULL
        ORDER BY o.fraud_score DESC, o.created_at DESC
        LIMIT 20
      `),
      
      // Recent suspicious activities
      database.query(`
        SELECT 
          activity_type, severity, details, ip_address, created_at
        FROM suspicious_activities
        WHERE resolved = false
          AND created_at >= NOW() - INTERVAL '${timeFilter}'
        ORDER BY severity DESC, created_at DESC
        LIMIT 15
      `),
      
      // Fraud trends over time
      database.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_orders,
          COUNT(CASE WHEN requires_manual_review = true THEN 1 END) as flagged_orders,
          AVG(fraud_score) as avg_fraud_score,
          COUNT(CASE WHEN fraud_level = 'CRITICAL' THEN 1 END) as critical_cases
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `)
    ]);

    res.json({
      success: true,
      data: {
        stats: fraudStats.rows[0],
        highRiskOrders: highRiskOrders.rows,
        suspiciousActivities: suspiciousActivities.rows,
        fraudTrends: fraudTrends.rows,
        period
      }
    });

  } catch (error) {
    console.error('Fraud dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch fraud dashboard',
      code: 'FRAUD_DASHBOARD_ERROR'
    });
  }
});

// Review fraud case
router.post('/fraud/review/:orderId', auth.authenticateAdmin, [
  body('action').isIn(['approve', 'reject', 'escalate']),
  body('notes').optional().isString(),
  body('additionalChecks').optional().isArray()
], handleValidationErrors, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, notes, additionalChecks } = req.body;
    const adminId = req.admin.id;

    // Get order details
    const orderResult = await database.query(`
      SELECT * FROM orders WHERE id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const order = orderResult.rows[0];

    // Update order fraud review
    await database.query(`
      UPDATE orders 
      SET fraud_reviewed_by = $1,
          fraud_reviewed_at = NOW(),
          fraud_review_action = $2,
          fraud_review_notes = $3,
          requires_manual_review = CASE WHEN $2 = 'approve' THEN false ELSE requires_manual_review END
      WHERE id = $4
    `, [adminId, action, notes, orderId]);

    // Log the review action
    await database.query(`
      INSERT INTO admin_logs (
        admin_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      adminId,
      `FRAUD_REVIEW_${action.toUpperCase()}`,
      'order',
      orderId,
      JSON.stringify({ action, notes, additionalChecks }),
      req.ip,
      req.get('User-Agent')
    ]);

    // Handle different actions
    if (action === 'reject') {
      // Cancel the order
      await database.query(`
        UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1
      `, [orderId]);
    } else if (action === 'escalate') {
      // Create escalation alert
      await database.query(`
        INSERT INTO security_alerts (
          alert_type, severity, admin_id, details, created_at
        ) VALUES ('FRAUD_ESCALATION', 'HIGH', $1, $2, NOW())
      `, [adminId, JSON.stringify({ orderId, notes })]);
    }

    res.json({
      success: true,
      message: `Fraud review ${action} completed`,
      orderId
    });

  } catch (error) {
    console.error('Fraud review error:', error);
    res.status(500).json({
      error: 'Failed to review fraud case',
      code: 'FRAUD_REVIEW_ERROR'
    });
  }
});

// ==================== CAPITAL CONTROL ====================

// Get capital control dashboard - Risk-weighted capital management
router.get('/capital/dashboard', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

    const [
      portfolioOverview,
      marginBreachAlerts,
      deadStockAnalysis,
      capitalEfficiency
    ] = await Promise.all([
      // Portfolio overview
      capitalControl.getPortfolioOverview(startDate.toISOString(), new Date().toISOString()),
      
      // Margin breach alerts
      capitalControl.getMarginBreachAlerts(),
      
      // Dead stock analysis
      capitalControl.getDeadStockAnalysis(),
      
      // Capital efficiency metrics
      database.query(`
        SELECT 
          SUM(capital_allocated) as total_capital,
          SUM(CASE WHEN status = 'active' THEN capital_allocated ELSE 0 END) as active_capital,
          COUNT(DISTINCT id) as total_skus,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_skus
        FROM products
      `)
    ]);

    res.json({
      success: true,
      data: {
        portfolio: portfolioOverview,
        marginAlerts: marginBreachAlerts,
        deadStock: deadStockAnalysis,
        efficiency: capitalEfficiency.rows[0],
        period
      }
    });

  } catch (error) {
    console.error('Capital dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch capital dashboard',
      code: 'CAPITAL_DASHBOARD_ERROR'
    });
  }
});

// Get SKU profitability analysis
router.get('/capital/sku/:productId', auth.authenticateAdmin, [
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate()
], handleValidationErrors, async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate } = req.query;

    const profitability = await capitalControl.calculateSKUProfitability(
      productId,
      startDate?.toISOString(),
      endDate?.toISOString()
    );

    res.json({
      success: true,
      data: profitability
    });

  } catch (error) {
    console.error('SKU profitability error:', error);
    res.status(500).json({
      error: 'Failed to fetch SKU profitability',
      code: 'SKU_PROFITABILITY_ERROR'
    });
  }
});

// ==================== ADMIN SECURITY ====================

// Get admin security dashboard
router.get('/security/dashboard', auth.authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;

    const [
      securitySettings,
      recentActivity,
      securityAlerts,
      activeSessions
    ] = await Promise.all([
      // Admin security settings
      adminSecurity.getAdminSecuritySettings(adminId),
      
      // Recent security activity
      adminSecurity.getSecurityAuditLog(adminId, 20, 0),
      
      // Security alerts
      database.query(`
        SELECT alert_type, severity, details, created_at
        FROM security_alerts
        WHERE admin_id = $1 AND is_resolved = false
        ORDER BY severity DESC, created_at DESC
        LIMIT 10
      `, [adminId]),
      
      // Active sessions
      database.query(`
        SELECT ip_address, user_agent, created_at, expires_at
        FROM admin_sessions
        WHERE admin_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [adminId])
    ]);

    res.json({
      success: true,
      data: {
        settings: securitySettings,
        recentActivity: recentActivity,
        alerts: securityAlerts.rows,
        activeSessions: activeSessions.rows
      }
    });

  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch security dashboard',
      code: 'SECURITY_DASHBOARD_ERROR'
    });
  }
});

// Enable 2FA for admin
router.post('/security/2fa/enable', auth.authenticateAdmin, [
  body('token').isLength({ min: 6, max: 6 })
], handleValidationErrors, async (req, res) => {
  try {
    const { token } = req.body;
    const adminId = req.admin.id;

    // Get admin's 2FA secret
    const adminResult = await database.query(`
      SELECT two_factor_secret FROM admins WHERE id = $1
    `, [adminId]);

    if (!adminResult.rows[0].two_factor_secret) {
      return res.status(400).json({
        error: '2FA not set up',
        code: '2FA_NOT_SETUP'
      });
    }

    // Verify token
    const isValid = adminSecurity.verify2FAToken(
      adminResult.rows[0].two_factor_secret,
      token
    );

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid 2FA token',
        code: 'INVALID_2FA_TOKEN'
      });
    }

    // Enable 2FA
    await adminSecurity.enable2FA(adminId, adminResult.rows[0].two_factor_secret);

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      error: 'Failed to enable 2FA',
      code: 'ENABLE_2FA_ERROR'
    });
  }
});

// Setup 2FA
router.post('/security/2fa/setup', auth.authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;
    const adminResult = await database.query(`
      SELECT email FROM admins WHERE id = $1
    `, [adminId]);

    const { secret } = adminSecurity.generate2FASecret(adminResult.rows[0].email);
    const qrCode = await adminSecurity.generate2FAQRCode(secret);

    // Store secret temporarily (not enabled yet)
    await database.query(`
      UPDATE admins SET two_factor_secret = $1 WHERE id = $2
    `, [secret, adminId]);

    res.json({
      success: true,
      data: {
        secret,
        qrCode,
        instructions: 'Scan QR code with authenticator app, then verify with token'
      }
    });

  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({
      error: 'Failed to setup 2FA',
      code: 'SETUP_2FA_ERROR'
    });
  }
});

// ==================== OPERATIONS CONTROL ====================

// Get operations dashboard - Decision-centric operations metrics
router.get('/operations/dashboard', auth.authenticateAdmin, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let timeFilter = '';
    switch (period) {
      case '1h': timeFilter = '1 hour'; break;
      case '24h': timeFilter = '24 hours'; break;
      case '7d': timeFilter = '7 days'; break;
      case '30d': timeFilter = '30 days'; break;
      default: timeFilter = '24 hours';
    }

    const [
      orderMetrics,
      fulfillmentMetrics,
      returnMetrics,
      paymentMetrics
    ] = await Promise.all([
      // Order processing metrics
      database.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
          COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          AVG(EXTRACT(EPOCH FROM (shipped_at - created_at))/3600) as avg_processing_hours
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${timeFilter}'
      `),
      
      // Fulfillment metrics
      database.query(`
        SELECT 
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN delivered_at <= shipped_at + INTERVAL '3 days' THEN 1 END) as on_time_deliveries,
          COUNT(CASE WHEN tracking_number IS NOT NULL THEN 1 END) as tracked_shipments,
          AVG(EXTRACT(EPOCH FROM (delivered_at - shipped_at))/86400) as avg_delivery_days
        FROM orders
        WHERE shipped_at >= NOW() - INTERVAL '${timeFilter}'
          AND status = 'delivered'
      `),
      
      // Return metrics (would need returns table)
      database.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END), 0) as lost_revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${timeFilter}'
      `),
      
      // Payment metrics
      database.query(`
        SELECT 
          payment_method,
          COUNT(*) as transaction_count,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as failed_transactions
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${timeFilter}'
        GROUP BY payment_method
        ORDER BY transaction_count DESC
      `)
    ]);

    const orderStats = orderMetrics.rows[0];
    const fulfillmentStats = fulfillmentMetrics.rows[0];
    const returnStats = returnMetrics.rows[0];

    res.json({
      success: true,
      data: {
        orders: {
          ...orderStats,
          processingEfficiency: orderStats.total_orders > 0 ? 
            (parseInt(orderStats.processing_orders) + parseInt(orderStats.shipped_orders) + parseInt(orderStats.delivered_orders)) / orderStats.total_orders * 100 : 0
        },
        fulfillment: {
          ...fulfillmentStats,
          onTimeDeliveryRate: fulfillmentStats.total_shipments > 0 ? 
            (parseInt(fulfillmentStats.on_time_deliveries) / fulfillmentStats.total_shipments) * 100 : 0,
          trackingRate: fulfillmentStats.total_shipments > 0 ? 
            (parseInt(fulfillmentStats.tracked_shipments) / fulfillmentStats.total_shipments) * 100 : 0
        },
        returns: {
          cancellationRate: returnStats.total_orders > 0 ? 
            (parseInt(returnStats.cancelled_orders) / returnStats.total_orders) * 100 : 0,
          lostRevenueRate: returnStats.total_revenue > 0 ? 
            (parseFloat(returnStats.lost_revenue) / parseFloat(returnStats.total_revenue)) * 100 : 0
        },
        payments: paymentMetrics.rows,
        period
      }
    });

  } catch (error) {
    console.error('Operations dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch operations dashboard',
      code: 'OPERATIONS_DASHBOARD_ERROR'
    });
  }
});

module.exports = router;
