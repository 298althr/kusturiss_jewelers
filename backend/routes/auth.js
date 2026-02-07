const express = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../config/database');
const emailTriggerService = require('../services/emailTriggerService');

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

// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'customer'
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'customer' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Customer registration
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').trim().isLength({ min: 1 }),
  body('last_name').trim().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Check if customer already exists
    const existingCustomer = await database.query(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(409).json({
        error: 'Customer already exists',
        code: 'CUSTOMER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create customer
    const result = await database.query(
      `INSERT INTO customers (email, password_hash, first_name, last_name, phone, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
       RETURNING id, email, first_name, last_name, phone, email_verified, created_at`,
      [email, hashedPassword, first_name, last_name, phone]
    );

    const customer = result.rows[0];

    // Trigger welcome email
    try {
      await emailTriggerService.processEvent({
        type: 'customer.registered',
        customer: customer
      });
    } catch (emailError) {
      console.error('Failed to trigger welcome email:', emailError);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(customer);

    // Store refresh token
    try {
      await database.query(
        'INSERT INTO customer_sessions (customer_id, session_token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
        [customer.id, refreshToken.substring(0, 250)] // Truncate if needed
      );
    } catch (sessionError) {
      console.error('Failed to store session:', sessionError);
    }

    res.status(201).json({
      message: 'Customer registered successfully',
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        email_verified: customer.email_verified
      },
      tokens: { accessToken, refreshToken }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Customer login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find customer
    const result = await database.query(
      'SELECT id, email, password_hash, first_name, last_name, phone, email_verified FROM customers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const customer = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, customer.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(customer);

    // Store refresh token (invalidate previous sessions)
    await database.query(
      'DELETE FROM customer_sessions WHERE customer_id = $1',
      [customer.id]
    );

    await database.query(
      'INSERT INTO customer_sessions (customer_id, refresh_token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
      [customer.id, refreshToken]
    );

    res.json({
      message: 'Login successful',
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        email_verified: customer.email_verified
      },
      tokens: { accessToken, refreshToken }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Admin login
router.post('/admin/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user
    const result = await database.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return res.status(401).json({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        type: 'admin',
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' } // Longer session for admins
    );

    const refreshToken = jwt.sign(
      { id: admin.id, type: 'admin' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Admin login successful',
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role
      },
      tokens: { accessToken, refreshToken }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Admin registration
router.post('/admin/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').trim().isLength({ min: 1 }),
  body('last_name').trim().isLength({ min: 1 }),
  body('role').optional().isIn(['admin', 'manager', 'support'])
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'support' } = req.body;

    // Check if admin already exists
    const existingAdmin = await database.query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({
        error: 'Admin already exists',
        code: 'ADMIN_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin
    const result = await database.query(
      `INSERT INTO admins (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role`,
      [email, hashedPassword, first_name, last_name, role]
    );

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: result.rows[0]
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', [
  body('refreshToken').notEmpty(),
], handleValidationErrors, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if refresh token exists in database
    const sessionResult = await database.query(
      'SELECT customer_id, expires_at FROM customer_sessions WHERE refresh_token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get customer details
    const customerResult = await database.query(
      'SELECT id, email, first_name, last_name, phone, email_verified FROM customers WHERE id = $1',
      [decoded.id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    const customer = customerResult.rows[0];

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(customer);

    // Update refresh token
    await database.query(
      'UPDATE customer_sessions SET refresh_token = $1, expires_at = NOW() + INTERVAL \'7 days\' WHERE customer_id = $2',
      [newRefreshToken, customer.id]
    );

    res.json({
      tokens: { accessToken, refreshToken: newRefreshToken }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove refresh token from database
      await database.query(
        'DELETE FROM customer_sessions WHERE refresh_token = $1',
        [refreshToken]
      );
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Get customer profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await database.query(
      `SELECT id, email, first_name, last_name, phone, email_verified, created_at, updated_at
       FROM customers WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    const customer = result.rows[0];

    // Get customer addresses
    const addressesResult = await database.query(
      'SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC',
      [customer.id]
    );

    res.json({
      customer: {
        ...customer,
        addresses: addressesResult.rows
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

// Test endpoint
router.post('/test', (req, res) => {
  console.log('🧪 Test endpoint hit!');
  res.json({ message: 'Test endpoint working' });
});

// Admin login
router.post('/admin/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const result = await database.query(
      'SELECT id, email, first_name, last_name, password_hash, role, is_active FROM admins WHERE email = $1',
      [email]
    );

    console.log('🔍 Admin lookup result:', result.rows);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const admin = result.rows[0];
    console.log('👤 Found admin:', admin.email, 'Active:', admin.is_active);

    if (!admin.is_active) {
      return res.status(401).json({
        error: 'Admin account is inactive',
        code: 'ADMIN_INACTIVE'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    console.log('🔐 Password valid:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: admin.id, role: admin.role, type: 'admin' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await database.query(
      'UPDATE admins SET last_login_at = NOW() WHERE id = $1',
      [admin.id]
    );

    res.json({
      message: 'Admin login successful',
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role,
        isActive: admin.is_active
      },
      tokens: { accessToken, refreshToken }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Admin profile
router.get('/admin/profile', async (req, res) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Admin access token required',
        code: 'ADMIN_TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(401).json({
        error: 'Invalid admin token',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }

    const result = await database.query(
      'SELECT id, email, first_name, last_name, role, is_active, last_login_at, created_at FROM admins WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    res.json({
      admin: result.rows[0]
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

// Update customer profile
router.put('/profile', [
  body('first_name').optional().trim().isLength({ min: 1 }),
  body('last_name').optional().trim().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone(),
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
    const { first_name, last_name, phone } = req.body;

    const result = await database.query(
      `UPDATE customers 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, first_name, last_name, phone, email_verified, updated_at`,
      [first_name, last_name, phone, decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

module.exports = router;
