const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../config/database');
const sessionService = require('../services/sessionService');
const emailTriggerService = require('../services/emailTriggerService');
const activityLogger = require('../services/activityLogger');

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

// Cookie helper middleware
const cookieParser = (req, res, next) => {
  // Parse cookies manually for better control
  req.cookies = {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      if (name && rest.length) {
        req.cookies[name.trim()] = rest.join('=').trim();
      }
    });
  }

  next();
};

// Session middleware for protected routes
const requireAuth = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.session_token;

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const session = await sessionService.validateSession(sessionToken);

    if (!session) {
      // Clear invalid cookie
      res.clearCookie('session_token', sessionService.cookieOptions);
      return res.status(401).json({
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION'
      });
    }

    req.user = session;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Enhanced customer registration with cookies
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().isLength({ min: 1, max: 100 }),
  body('last_name').trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isMobilePhone(),
  body('accepts_marketing').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, accepts_marketing } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Check if customer already exists
    const existingCustomer = await database.query(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );

    if (existingCustomer.rows.length > 0) {
      console.log('⚠️ Registration failed: Email exists:', email);
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    console.log('📝 Registering new customer:', email);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verificationToken = jwt.sign(
      { email, type: 'email_verification' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create customer
    const result = await database.query(`
      INSERT INTO customers (
        email, password_hash, first_name, last_name, phone, 
        accepts_marketing, email_verification_token, 
        email_verification_expires, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '24 hours', NOW())
      RETURNING id, email, first_name, last_name, phone, accepts_marketing, created_at
    `, [email, passwordHash, first_name, last_name, phone, accepts_marketing, verificationToken]);

    const customer = result.rows[0];

    // Create session
    const session = await sessionService.createSession(
      customer.id,
      ipAddress,
      userAgent,
      true // Remember me by default
    );

    // Set session cookie
    res.cookie('session_token', session.sessionToken, session.cookieOptions);

    // Handle visitor tracking
    const visitorId = req.cookies.visitor_id;
    if (visitorId) {
      await sessionService.updateVisitorTracking(visitorId, ipAddress, userAgent);
    }

    // Send welcome email
    try {
      await emailTriggerService.processEvent('customer_registration', {
        customerId: customer.id,
        customerEmail: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    // Log activity
    await activityLogger.log(req, 'customer_registration', { customerId: customer.id, email: customer.email });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        emailVerified: false,
        acceptsMarketing: customer.accepts_marketing
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Enhanced login with cookies
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  body('remember_me').optional().isBoolean()
], handleValidationErrors, cookieParser, async (req, res) => {
  try {
    const { email, password, remember_me } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Find customer
    const result = await database.query(
      'SELECT id, email, password_hash, first_name, last_name, is_active, email_verified FROM customers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ Login failed: Email not found:', email);
      // Log failed attempt
      await activityLogger.log(req, 'login_failure', { email, reason: 'user_not_found' });
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const customer = result.rows[0];
    console.log('🔍 Found customer:', customer.email, 'Active:', customer.is_active);

    if (!customer.is_active) {
      return res.status(401).json({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, customer.password_hash);
    console.log('🔐 Password verification for', email, ':', isValidPassword);

    if (!isValidPassword) {
      // Log failed attempt
      await activityLogger.log(req, 'login_failure', { email, reason: 'invalid_password' });
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Create session
    const session = await sessionService.createSession(
      customer.id,
      ipAddress,
      userAgent,
      remember_me || false
    );

    // Set session cookie
    res.cookie('session_token', session.sessionToken, session.cookieOptions);

    // Log activity
    await activityLogger.log(req, 'customer_login', { customerId: customer.id, email: customer.email });

    // Handle visitor tracking
    const visitorId = req.cookies.visitor_id;
    if (visitorId) {
      await sessionService.updateVisitorTracking(visitorId, ipAddress, userAgent);
    }

    res.json({
      success: true,
      message: 'Login successful',
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        emailVerified: customer.email_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await sessionService.destroySession(req.cookies.session_token);

    // Clear session cookie
    res.clearCookie('session_token', sessionService.cookieOptions);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const result = await database.query(`
      SELECT 
        id, email, first_name, last_name, phone, 
        email_verified, accepts_marketing, created_at, last_login_at
      FROM customers 
      WHERE id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const customer = result.rows[0];

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        emailVerified: customer.email_verified,
        acceptsMarketing: customer.accepts_marketing,
        createdAt: customer.created_at,
        lastLoginAt: customer.last_login_at
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Update profile
router.put('/profile', requireAuth, [
  body('first_name').optional().trim().isLength({ min: 1, max: 100 }),
  body('last_name').optional().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isMobilePhone(),
  body('accepts_marketing').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
  try {
    const { first_name, last_name, phone, accepts_marketing } = req.body;
    const userId = req.user.userId;

    const result = await database.query(`
      UPDATE customers 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          accepts_marketing = COALESCE($4, accepts_marketing),
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, first_name, last_name, phone, accepts_marketing, updated_at
    `, [first_name, last_name, phone, accepts_marketing, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// Get user sessions (active devices)
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await sessionService.getUserSessions(req.user.userId);

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      code: 'SESSIONS_ERROR'
    });
  }
});

// Logout from all devices
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await sessionService.destroyAllUserSessions(req.user.userId);

    // Clear session cookie
    res.clearCookie('session_token', sessionService.cookieOptions);

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Failed to logout from all devices',
      code: 'LOGOUT_ALL_ERROR'
    });
  }
});

// Email verification
router.post('/verify-email', [
  body('token').isLength({ min: 32, max: 255 })
], handleValidationErrors, async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        error: 'Invalid verification token',
        code: 'INVALID_TOKEN'
      });
    }

    // Update customer email verification
    const result = await database.query(`
      UPDATE customers 
      SET email_verified = true,
          email_verification_token = NULL,
          email_verification_expires = NULL,
          updated_at = NOW()
      WHERE email = $1 AND email_verification_token = $2
        AND email_verification_expires > NOW()
      RETURNING id, email, email_verified
    `, [decoded.email, token]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Email verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        error: 'Invalid verification token',
        code: 'INVALID_TOKEN'
      });
    }
    res.status(500).json({
      error: 'Email verification failed',
      code: 'EMAIL_VERIFICATION_ERROR'
    });
  }
});

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    // Find customer
    const result = await database.query(
      'SELECT id, email_verified, email_verification_token, email_verification_expires FROM customers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const customer = result.rows[0];

    if (customer.email_verified) {
      return res.status(400).json({
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Generate new verification token
    const verificationToken = jwt.sign(
      { email, type: 'email_verification' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update customer with new token
    await database.query(`
      UPDATE customers 
      SET email_verification_token = $1,
          email_verification_expires = NOW() + INTERVAL '24 hours',
          updated_at = NOW()
      WHERE id = $2
    `, [verificationToken, customer.id]);

    // Send verification email
    try {
      await emailTriggerService.processEvent('email_verification', {
        customerId: customer.id,
        customerEmail: customer.email,
        verificationToken
      });
    } catch (emailError) {
      console.error('Verification email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Verification email sent'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Failed to resend verification email',
      code: 'RESEND_VERIFICATION_ERROR'
    });
  }
});

// Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    // Find customer
    const result = await database.query(
      'SELECT id, email, first_name, last_name FROM customers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if account exists
      return res.json({
        success: true,
        message: 'If an account exists, a reset link has been sent'
      });
    }

    const customer = result.rows[0];

    // Generate token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    await database.query(`
      UPDATE customers 
      SET password_reset_token = $1,
          password_reset_expires = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [resetToken, resetExpires, customer.id]);

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await emailTriggerService.processEvent({
      type: 'password.reset',
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name
      },
      resetUrl
    });

    res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find customer with valid token
    const result = await database.query(`
      SELECT id FROM customers 
      WHERE password_reset_token = $1 
      AND password_reset_expires > NOW()
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
    }

    const customer = result.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear token
    await database.query(`
      UPDATE customers 
      SET password_hash = $1,
          password_reset_token = NULL,
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [passwordHash, customer.id]);

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
});

module.exports = router;
