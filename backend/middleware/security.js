const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const Joi = require('joi');

class SecurityMiddleware {
  constructor() {
    this.setupSecurityHeaders();
    this.setupRateLimiting();
    this.setupInputValidation();
  }

  // Security headers configuration
  setupSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://api.stripe.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // Rate limiting configuration
  setupRateLimiting() {
    // General API rate limiting
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests from this IP',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(15 * 60)
        });
      }
    });

    // Strict rate limiting for authentication endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
      },
      skipSuccessfulRequests: true
    });

    // Very strict rate limiting for password reset
    const passwordResetLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Limit each IP to 3 password reset requests per hour
      message: {
        error: 'Too many password reset attempts',
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
      }
    });

    return { apiLimiter, authLimiter, passwordResetLimiter };
  }

  // Input validation schemas
  setupInputValidation() {
    const schemas = {
      // Product validation
      product: Joi.object({
        sku: Joi.string().required().max(100),
        name: Joi.string().required().max(500),
        description: Joi.string().allow('').max(5000),
        shortDescription: Joi.string().allow('').max(1000),
        price: Joi.number().positive().required(),
        compareAtPrice: Joi.number().positive().optional(),
        costPrice: Joi.number().positive().optional(),
        weight: Joi.number().positive().optional(),
        dimensions: Joi.object({
          length: Joi.number().positive(),
          width: Joi.number().positive(),
          height: Joi.number().positive()
        }).optional(),
        inventoryCount: Joi.number().integer().min(0).default(0),
        trackInventory: Joi.boolean().default(true),
        allowBackorder: Joi.boolean().default(false),
        requiresShipping: Joi.boolean().default(true),
        isTaxable: Joi.boolean().default(true),
        status: Joi.string().valid('active', 'draft', 'archived').default('active'),
        seoTitle: Joi.string().allow('').max(500),
        seoDescription: Joi.string().allow('').max(500)
      }),

      // Customer registration
      customerRegistration: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required(),
        firstName: Joi.string().required().max(200),
        lastName: Joi.string().required().max(200),
        phone: Joi.string().optional().max(50),
        acceptsMarketing: Joi.boolean().default(false)
      }),

      // Customer login
      customerLogin: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      }),

      // Admin login
      adminLogin: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      }),

      // Order creation
      order: Joi.object({
        email: Joi.string().email().required(),
        shippingAddress: Joi.object({
          firstName: Joi.string().required(),
          lastName: Joi.string().required(),
          company: Joi.string().allow(''),
          address1: Joi.string().required(),
          address2: Joi.string().allow(''),
          city: Joi.string().required(),
          province: Joi.string().allow(''),
          country: Joi.string().required(),
          postalCode: Joi.string().required(),
          phone: Joi.string().optional()
        }).required(),
        billingAddress: Joi.object({
          firstName: Joi.string().required(),
          lastName: Joi.string().required(),
          company: Joi.string().allow(''),
          address1: Joi.string().required(),
          address2: Joi.string().allow(''),
          city: Joi.string().required(),
          province: Joi.string().allow(''),
          country: Joi.string().required(),
          postalCode: Joi.string().required(),
          phone: Joi.string().optional()
        }).optional(),
        items: Joi.array().items(
          Joi.object({
            productId: Joi.string().uuid().required(),
            variantId: Joi.string().uuid().optional(),
            quantity: Joi.number().integer().min(1).required()
          })
        ).min(1).required(),
        notes: Joi.string().allow('').max(1000)
      }),

      // Offer creation
      offer: Joi.object({
        name: Joi.string().required().max(200),
        description: Joi.string().allow('').max(1000),
        type: Joi.string().valid('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y').required(),
        value: Joi.number().positive().when('type', {
          is: 'free_shipping',
          then: Joi.optional(),
          otherwise: Joi.required()
        }),
        minimumAmount: Joi.number().positive().optional(),
        minimumQuantity: Joi.number().integer().min(1).default(1),
        usageLimitPerCustomer: Joi.number().integer().min(1).optional(),
        usageLimitTotal: Joi.number().integer().min(1).optional(),
        startsAt: Joi.date().optional(),
        expiresAt: Joi.date().min(Joi.ref('startsAt')).optional(),
        isActive: Joi.boolean().default(true),
        autoApply: Joi.boolean().default(false),
        productIds: Joi.array().items(Joi.string().uuid()).optional(),
        categoryIds: Joi.array().items(Joi.string().uuid()).optional(),
        customerTagIds: Joi.array().items(Joi.string().uuid()).optional()
      })
    };

    return schemas;
  }

  // Input sanitization middleware
  sanitizeInput() {
    return (req, res, next) => {
      // Sanitize request body
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanify URL parameters
      if (req.params) {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    };
  }

  // Recursive object sanitization
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Skip sanitization for passwords to prevent character escaping
        if (key.toLowerCase().includes('password')) {
          sanitized[key] = value;
        } else {
          // Remove any potential XSS attacks
          sanitized[key] = xss(value, {
            whiteList: {}, // No HTML tags allowed
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script']
          });
        }
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Validation middleware factory
  validate(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors
        });
      }

      req.body = value;
      next();
    };
  }

  // SQL injection prevention
  preventSQLInjection() {
    return (req, res, next) => {
      // Check for common SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(--|;|\/\*|\*\/|xp_|sp_)/gi,
        /(\bOR\b.*=.*\bOR\b)/gi,
        /(\bAND\b.*=.*\bAND\b)/gi
      ];

      const checkValue = (value) => {
        if (typeof value === 'string') {
          for (const pattern of sqlPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
        }
        return true;
      };

      const checkObject = (obj) => {
        for (const value of Object.values(obj)) {
          if (typeof value === 'string' && !checkValue(value)) {
            return false;
          } else if (typeof value === 'object' && value !== null && !checkObject(value)) {
            return false;
          }
        }
        return true;
      };

      if (!checkObject(req.body || {}) || !checkObject(req.query || {}) || !checkObject(req.params || {})) {
        return res.status(400).json({
          error: 'Invalid input detected',
          code: 'INVALID_INPUT'
        });
      }

      next();
    };
  }

  // CORS configuration
  setupCors() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];

    return (req, res, next) => {
      const origin = req.headers.origin;

      if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }

      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    };
  }

  // Request logging for security monitoring
  securityLogger() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Log suspicious activity
      const suspiciousPatterns = [
        /\.\./,  // Path traversal
        /<script/i,  // XSS attempt
        /union.*select/i,  // SQL injection
        /javascript:/i  // JavaScript protocol
      ];

      const isSuspicious = suspiciousPatterns.some(pattern =>
        pattern.test(req.url) ||
        pattern.test(JSON.stringify(req.body))
      );

      if (isSuspicious) {
        console.warn('🚨 Suspicious request detected:', {
          ip: req.ip,
          method: req.method,
          url: req.url,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }

      // Log request completion
      res.on('finish', () => {
        const duration = Date.now() - startTime;

        if (res.statusCode >= 400 || isSuspicious) {
          console.log('🔒 Security log:', {
            ip: req.ip,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });
        }
      });

      next();
    };
  }
}

module.exports = new SecurityMiddleware();
