require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import middleware
const security = require('./middleware/security');
const auth = require('./middleware/auth');
const rateLimiting = require('./middleware/rateLimiting');

// Import database
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const database = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const offerRoutes = require('./routes/offers');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const paymentRoutes = require('./routes/payments');
const emailAnalyticsRoutes = require('./routes/email-analytics');
const adminAnalyticsRoutes = require('./routes/admin-analytics-fixed');
const adminManagementRoutes = require('./routes/admin-management');
const adminUsersRoutes = require('./routes/admin-users');
const adminTestRoutes = require('./routes/admin-test');
const adminAdvancedRoutes = require('./routes/admin-advanced');
const userAuthRoutes = require('./routes/user-auth');
const adminUserManagementRoutes = require('./routes/admin-user-management');
const consultationRoutes = require('./routes/consultations');
const jewelryPurchaseRoutes = require('./routes/jewelry-purchases');
const aiToolsRoutes = require('./routes/ai-tools');

class EcommerceApp {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 4000;
    this.host = process.env.HOST || '0.0.0.0';

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddleware() {
    // Security middleware
    this.app.use(security.setupSecurityHeaders());
    this.app.use(security.setupCors());
    this.app.use(security.sanitizeInput());
    this.app.use(security.preventSQLInjection());
    this.app.use(security.securityLogger());

    // Rate limiting
    this.app.use(rateLimiting.apiLimiter());

    // General middleware
    this.app.use(compression());
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    this.app.use('/static', express.static(path.join(__dirname, 'public')));

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`📊 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });

      next();
    });
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        const redisStats = rateLimiting.redisClient ? 'connected' : 'disconnected';

        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: dbHealth,
            redis: redisStats
          }
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // API routes
    this.app.use('/api/auth', rateLimiting.authLimiter(), authRoutes);
    this.app.use('/api/user', userAuthRoutes);
    this.app.use('/api/products', productRoutes);
    this.app.use('/api/customers', customerRoutes);
    this.app.use('/api/orders', rateLimiting.orderLimiter(), orderRoutes);
    this.app.use('/api/offers', offerRoutes);
    this.app.use('/api/admin/user-management', adminUserManagementRoutes);
    this.app.use('/api/admin/analytics', adminAnalyticsRoutes);
    this.app.use('/api/admin/management', adminManagementRoutes);
    this.app.use('/api/admin/users', adminUsersRoutes);
    this.app.use('/api/admin/test', adminTestRoutes);
    this.app.use('/api/admin/advanced', adminAdvancedRoutes);
    this.app.use('/api/admin', rateLimiting.adminLimiter(), adminRoutes);
    this.app.use('/api/cart', cartRoutes);
    this.app.use('/api/checkout', checkoutRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/email', emailAnalyticsRoutes);
    this.app.use('/api/consultations', consultationRoutes);
    this.app.use('/api/jewelry-purchases', jewelryPurchaseRoutes);
    this.app.use('/api/ai', aiToolsRoutes);

    // Serve static files if needed
    // In Railway, frontend and backend are separate, so this is handled by the frontend service.

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl
      });
    });
  }

  initializeErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('🚨 Global error handler:', error);

      // Database errors
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          error: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE'
        });
      }

      if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
          error: 'Referenced resource does not exist',
          code: 'INVALID_REFERENCE'
        });
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.details
        });
      }

      // Rate limiting errors
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: error.message,
          code: error.code,
          retryAfter: error.retryAfter
        });
      }

      // Default error
      res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message,
        code: error.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      process.exit(1);
    });
  }

  async start() {
    // Start server first so health checks pass immediately
    this.server = this.app.listen(this.port, this.host, () => {
      console.log(`🚀 Kusturiss Backend listening on http://${this.host}:${this.port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://${this.host}:${this.port}/api/health`);
    });

    try {
      console.log('🔄 Initializing services...');

      // Connect to database with retry logic
      let connected = false;
      let retries = 5;
      while (!connected && retries > 0) {
        try {
          await database.connect();
          connected = true;
        } catch (err) {
          retries--;
          console.error(`⚠️ Database connection attempt failed (${retries} retries left):`, err.message);
          if (retries > 0) await new Promise(res => setTimeout(res, 3000));
        }
      }

      if (connected) {
        // Run migrations
        try {
          await database.migrate();
          console.log('✅ Migrations completed');
        } catch (migrateErr) {
          console.error('❌ Migration failed:', migrateErr.message);
        }
      } else {
        console.error('❌ Critical: Database connection failed. Health check will report unhealthy.');
      }

      // Graceful shutdown
      const gracefulShutdown = async (signal) => {
        console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
        this.server.close(async () => {
          console.log('✅ HTTP server closed');
          await database.disconnect();
          await rateLimiting.disconnect();
          console.log('✅ Graceful shutdown complete');
          process.exit(0);
        });

        setTimeout(() => {
          console.error('❌ Forced shutdown after timeout');
          process.exit(1);
        }, 30000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
      console.error('🚨 Serious failure during initialization:', error.message);
    }
  }
}

// Start the application
const app = new EcommerceApp();
app.start();

module.exports = app;
