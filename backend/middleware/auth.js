const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('../config/database');

class AuthMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  // Generate JWT tokens
  generateTokens(payload) {
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'ecommerce-template',
      audience: 'ecommerce-users'
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
      issuer: 'ecommerce-template',
      audience: 'ecommerce-users'
    });

    return { accessToken, refreshToken };
  }

  // Verify JWT token
  verifyToken(token, isRefresh = false) {
    const secret = isRefresh ? this.jwtRefreshSecret : this.jwtSecret;

    try {
      return jwt.verify(token, secret, {
        issuer: 'ecommerce-template',
        audience: 'ecommerce-users'
      });
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, this.bcryptRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Authentication middleware for API routes
  authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    try {
      const decoded = this.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }
  }

  // Admin authentication middleware
  async authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Admin access token required',
        code: 'ADMIN_TOKEN_MISSING'
      });
    }

    try {
      const decoded = this.verifyToken(token);
      console.log('🔑 Admin token decoded:', decoded);

      // Verify admin user exists and is active
      const adminResult = await database.query(
        'SELECT id, email, role, is_active FROM admins WHERE id = $1 AND is_active = true',
        [decoded.id]
      );

      console.log('👤 Admin query result:', adminResult.rows);

      if (adminResult.rows.length === 0) {
        return res.status(403).json({
          error: 'Admin account not found or inactive',
          code: 'ADMIN_NOT_FOUND'
        });
      }

      req.admin = {
        id: adminResult.rows[0].id,
        email: adminResult.rows[0].email,
        role: adminResult.rows[0].role
      };

      next();
    } catch (error) {
      console.log('❌ Admin auth error:', error.message);
      return res.status(403).json({
        error: 'Invalid or expired admin token',
        code: 'ADMIN_TOKEN_INVALID'
      });
    }
  }

  // Role-based access control
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.admin) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(req.admin.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.admin.role
        });
      }

      next();
    };
  }

  // Customer authentication middleware
  async authenticateCustomer(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Customer access token required',
        code: 'CUSTOMER_TOKEN_MISSING'
      });
    }

    try {
      const decoded = this.verifyToken(token);

      // Verify customer exists
      const customerResult = await database.query(
        'SELECT id, email, email_verified FROM customers WHERE id = $1',
        [decoded.userId]
      );

      if (customerResult.rows.length === 0) {
        return res.status(403).json({
          error: 'Customer account not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      req.customer = {
        id: customerResult.rows[0].id,
        email: customerResult.rows[0].email,
        emailVerified: customerResult.rows[0].email_verified
      };

      next();
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid or expired customer token',
        code: 'CUSTOMER_TOKEN_INVALID'
      });
    }
  }

  // Optional authentication (doesn't fail if no token)
  optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = this.verifyToken(token);
      req.user = decoded;
    } catch (error) {
      req.user = null;
    }

    next();
  }

  // Rate limiting middleware
  createRateLimiter(windowMs, maxRequests, message = 'Too many requests') {
    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [ip, timestamps] of requests.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          requests.delete(ip);
        } else {
          requests.set(ip, validTimestamps);
        }
      }

      // Check current IP
      const ipRequests = requests.get(key) || [];
      const recentRequests = ipRequests.filter(timestamp => timestamp > windowStart);

      if (recentRequests.length >= maxRequests) {
        return res.status(429).json({
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      recentRequests.push(now);
      requests.set(key, recentRequests);

      next();
    };
  }

  // Login admin
  async loginAdmin(email, password, ip = null) {
    try {
      const result = await database.query(
        'SELECT id, email, password_hash, first_name, last_name, role, is_active, failed_login_attempts, locked_until FROM admins WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Log attempt
        await database.query('INSERT INTO login_attempts (identifier, type, ip_address, success) VALUES ($1, $2, $3, $4)', [email, 'admin', ip, false]);
        throw new Error('Invalid credentials');
      }

      const admin = result.rows[0];

      // Check lockout
      if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
        throw new Error(`Account locked. Please try again after ${new Date(admin.locked_until).toLocaleTimeString()}`);
      }

      if (!admin.is_active) {
        throw new Error('Admin account is inactive');
      }

      const isValidPassword = await this.comparePassword(password, admin.password_hash);

      if (!isValidPassword) {
        // Increment failures
        const newFailures = (admin.failed_login_attempts || 0) + 1;
        let lockedUntil = null;
        if (newFailures >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
        }

        await database.query(
          'UPDATE admins SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newFailures, lockedUntil, admin.id]
        );

        // Log attempt
        await database.query('INSERT INTO login_attempts (identifier, type, ip_address, success) VALUES ($1, $2, $3, $4)', [email, 'admin', ip, false]);

        throw new Error('Invalid credentials');
      }

      // Success - reset failures
      await database.query(
        'UPDATE admins SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [admin.id]
      );

      // Log success
      await database.query('INSERT INTO login_attempts (identifier, type, ip_address, success) VALUES ($1, $2, $3, $4)', [email, 'admin', ip, true]);

      const tokens = this.generateTokens({
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      });

      return {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.first_name,
          lastName: admin.last_name,
          role: admin.role
        },
        tokens
      };
    } catch (error) {
      throw new Error(`Admin login failed: ${error.message}`);
    }
  }

  // Login customer
  async loginCustomer(email, password, ip = null) {
    try {
      const result = await database.query(
        'SELECT id, email, password_hash, first_name, last_name, email_verified, failed_login_attempts, locked_until FROM customers WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Log attempt
        await database.query('INSERT INTO login_attempts (identifier, type, ip_address, success) VALUES ($1, $2, $3, $4)', [email, 'customer', ip, false]);
        throw new Error('Invalid credentials');
      }

      const customer = result.rows[0];

      // Check lockout
      if (customer.locked_until && new Date(customer.locked_until) > new Date()) {
        throw new Error(`Account locked. Please try again after ${new Date(customer.locked_until).toLocaleTimeString()}`);
      }

      const isValidPassword = await this.comparePassword(password, customer.password_hash);

      if (!isValidPassword) {
        // Increment failures
        const newFailures = (customer.failed_login_attempts || 0) + 1;
        let lockedUntil = null;
        if (newFailures >= 5) {
          lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        }

        await database.query(
          'UPDATE customers SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newFailures, lockedUntil, customer.id]
        );

        // Log attempt
        await database.query('INSERT INTO login_attempts (identifier, type, ip_address, success) VALUES ($1, $2, $3, $4)', [email, 'customer', ip, false]);

        throw new Error('Invalid credentials');
      }

      // Success - reset failures
      await database.query(
        'UPDATE customers SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [customer.id]
      );

      // Log success
      await database.query('INSERT INTO login_attempts (identifier, type, ip_address, success) VALUES ($1, $2, $3, $4)', [email, 'customer', ip, true]);

      const tokens = this.generateTokens({
        userId: customer.id,
        email: customer.email,
        type: 'customer'
      });

      return {
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          emailVerified: customer.email_verified
        },
        tokens
      };
    } catch (error) {
      throw new Error(`Customer login failed: ${error.message}`);
    }
  }

  // Refresh tokens
  async refreshTokens(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken, true);

      // Determine user type and fetch user data
      let userData;
      if (decoded.type === 'admin') {
        const result = await database.query(
          'SELECT id, email, role FROM admins WHERE id = $1 AND is_active = true',
          [decoded.userId]
        );
        userData = result.rows[0];
      } else if (decoded.type === 'customer') {
        const result = await database.query(
          'SELECT id, email FROM customers WHERE id = $1',
          [decoded.userId]
        );
        userData = result.rows[0];
      }

      if (!userData) {
        throw new Error('User not found');
      }

      const tokens = this.generateTokens({
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        type: decoded.type
      });

      return tokens;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}

module.exports = new AuthMiddleware();
