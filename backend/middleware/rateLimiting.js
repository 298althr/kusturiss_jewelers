const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('redis');

class RateLimitingMiddleware {
  constructor() {
    this.redisClient = null;
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          password: process.env.REDIS_PASSWORD || undefined
        });
        
        await this.redisClient.connect();
        console.log('✅ Redis connected for rate limiting');
      }
    } catch (error) {
      console.warn('⚠️ Redis not available, using memory store for rate limiting');
    }
  }

  // Create rate limiter with Redis store if available
  createRateLimiter(options) {
    const config = {
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
      max: options.max || 100,
      message: {
        error: options.message || 'Too many requests',
        code: options.code || 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: options.message || 'Too many requests',
          code: options.code || 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
        });
      }
    };

    // Use Redis store if available
    if (this.redisClient) {
      config.store = new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args),
        prefix: options.prefix || 'rl:'
      });
    }

    return rateLimit(config);
  }

  // General API rate limiting
  apiLimiter() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: 'Too many API requests',
      code: 'API_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:api:'
    });
  }

  // Authentication rate limiting (strict)
  authLimiter() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per 15 minutes
      message: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:auth:'
    });
  }

  // Password reset rate limiting (very strict)
  passwordResetLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 attempts per hour
      message: 'Too many password reset attempts',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:pwdreset:'
    });
  }

  // Registration rate limiting
  registrationLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 registrations per hour
      message: 'Too many registration attempts',
      code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:register:'
    });
  }

  // Order creation rate limiting
  orderLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // 50 orders per hour
      message: 'Too many order attempts',
      code: 'ORDER_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:order:'
    });
  }

  // Contact form rate limiting
  contactLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 contact submissions per hour
      message: 'Too many contact form submissions',
      code: 'CONTACT_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:contact:'
    });
  }

  // Search rate limiting
  searchLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      message: 'Too many search requests',
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:search:'
    });
  }

  // File upload rate limiting
  uploadLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 uploads per hour
      message: 'Too many file uploads',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:upload:'
    });
  }

  // Admin dashboard rate limiting
  adminLimiter() {
    return this.createRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 200, // 200 requests per 5 minutes
      message: 'Too many admin dashboard requests',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      prefix: 'rl:admin:'
    });
  }

  // Custom rate limiter for specific endpoints
  customLimiter(options) {
    return this.createRateLimiter(options);
  }

  // Dynamic rate limiting based on user role
  dynamicLimiter(req, res, next) {
    const user = req.user || req.admin;
    
    let limiter;
    
    if (!user) {
      // Unauthenticated users - strictest limits
      limiter = this.createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 50,
        message: 'Too many requests for unauthenticated users',
        code: 'UNAUTH_RATE_LIMIT_EXCEEDED',
        prefix: 'rl:unauth:'
      });
    } else if (user.role === 'admin') {
      // Admin users - more lenient limits
      limiter = this.createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: 'Too many admin requests',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        prefix: 'rl:admin_user:'
      });
    } else {
      // Regular authenticated users
      limiter = this.createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 150,
        message: 'Too many user requests',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        prefix: 'rl:user:'
      });
    }

    return limiter(req, res, next);
  }

  // Progressive rate limiting (gets stricter with repeated violations)
  progressiveLimiter(baseOptions) {
    const violations = new Map(); // In-memory store for violations count

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const currentViolations = violations.get(key) || 0;
      
      // Increase limits based on violations
      const multiplier = Math.pow(2, Math.min(currentViolations, 5)); // Max 32x multiplier
      const adjustedMax = Math.max(1, Math.floor((baseOptions.max || 100) / multiplier));
      
      const limiter = this.createRateLimiter({
        ...baseOptions,
        max: adjustedMax,
        message: `Rate limit reduced due to repeated violations. Current limit: ${adjustedMax} requests`,
        code: 'PROGRESSIVE_RATE_LIMIT_EXCEEDED'
      });

      // Track violations
      const originalHandler = limiter.handler;
      limiter.handler = (req, res) => {
        violations.set(key, currentViolations + 1);
        
        // Reset violations after 24 hours
        setTimeout(() => {
          violations.set(key, Math.max(0, violations.get(key) - 1));
        }, 24 * 60 * 60 * 1000);
        
        originalHandler(req, res);
      };

      limiter(req, res, next);
    };
  }

  // Rate limiting for specific IP ranges (whitelist/blacklist)
  ipRangeLimiter(whitelist = [], blacklist = [], options = {}) {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      
      // Check blacklist first
      if (blacklist.some(range => this.ipInRange(ip, range))) {
        return res.status(403).json({
          error: 'Access denied from this IP range',
          code: 'IP_BLACKLISTED'
        });
      }
      
      // Check whitelist
      if (whitelist.length > 0 && !whitelist.some(range => this.ipInRange(ip, range))) {
        return res.status(403).json({
          error: 'Access not allowed from this IP range',
          code: 'IP_NOT_WHITELISTED'
        });
      }
      
      // Apply rate limiting
      const limiter = this.createRateLimiter(options);
      limiter(req, res, next);
    };
  }

  // Helper function to check if IP is in range
  ipInRange(ip, range) {
    // Simple implementation for CIDR notation
    if (range.includes('/')) {
      const [network, prefixLength] = range.split('/');
      // This is a simplified implementation
      // In production, use a proper IP range library
      return ip.startsWith(network.split('.').slice(0, Math.floor(prefixLength / 8)).join('.'));
    }
    
    // Exact match
    return ip === range;
  }

  // Rate limiting based on request size
  sizeBasedLimiter(options = {}) {
    const {
      maxRequestSize = 1024 * 1024, // 1MB default
      windowMs = 15 * 60 * 1000,
      maxRequests = 100
    } = options;

    const sizeTracking = new Map();

    return (req, res, next) => {
      const contentLength = parseInt(req.get('Content-Length') || '0');
      const ip = req.ip || req.connection.remoteAddress;
      
      if (contentLength > maxRequestSize) {
        return res.status(413).json({
          error: 'Request too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize: maxRequestSize
        });
      }

      const current = sizeTracking.get(ip) || { count: 0, totalSize: 0, resetTime: Date.now() + windowMs };
      
      if (Date.now() > current.resetTime) {
        current.count = 0;
        current.totalSize = 0;
        current.resetTime = Date.now() + windowMs;
      }

      current.count++;
      current.totalSize += contentLength;

      if (current.count > maxRequests || current.totalSize > maxRequestSize * maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded based on request size',
          code: 'SIZE_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((current.resetTime - Date.now()) / 1000)
        });
      }

      sizeTracking.set(ip, current);
      next();
    };
  }

  // Cleanup method for Redis client
  async disconnect() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('✅ Redis disconnected');
    }
  }
}

module.exports = new RateLimitingMiddleware();
