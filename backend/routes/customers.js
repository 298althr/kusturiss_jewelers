const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../config/database');

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
      type: 'customer',
      role: 'customer'
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
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
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

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(customer);

    // Store refresh token
    await database.query(
      'INSERT INTO customer_sessions (customer_id, refresh_token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
      [customer.id, refreshToken]
    );

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
