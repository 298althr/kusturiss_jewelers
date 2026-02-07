const express = require('express');
const router = express.Router();

// Import middleware and services
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const database = require('../config/database');

// Validation schemas
const schemas = security.setupInputValidation();

// Customer registration
router.post('/register', 
  security.validate(schemas.customerRegistration),
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone, acceptsMarketing } = req.body;

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
      const passwordHash = await bcrypt.hash(password, 12);

      // Create customer
      const result = await database.query(
        `INSERT INTO customers (email, password_hash, first_name, last_name, phone, accepts_marketing) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, first_name, last_name, phone, accepts_marketing, created_at`,
        [email, passwordHash, firstName, lastName, phone, acceptsMarketing]
      );

      const customer = result.rows[0];

      // Create customer preferences
      await database.query(
        `INSERT INTO customer_preferences (customer_id) VALUES ($1)`,
        [customer.id]
      );

      // Generate tokens
      const tokens = auth.generateTokens({
        userId: customer.id,
        email: customer.email,
        type: 'customer'
      });

      res.status(201).json({
        message: 'Customer registered successfully',
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
          acceptsMarketing: customer.accepts_marketing,
          createdAt: customer.created_at
        },
        tokens
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      });
    }
  }
);

// Customer login
router.post('/login',
  security.validate(schemas.customerLogin),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await auth.loginCustomer(email, password);

      res.json({
        message: 'Login successful',
        ...result
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error.message,
        code: 'LOGIN_FAILED'
      });
    }
  }
);

// Admin login
router.post('/admin/login',
  security.validate(schemas.adminLogin),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await auth.loginAdmin(email, password);

      res.json({
        message: 'Admin login successful',
        ...result
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(401).json({
        error: error.message,
        code: 'ADMIN_LOGIN_FAILED'
      });
    }
  }
);

// Refresh tokens
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const tokens = await auth.refreshTokens(refreshToken);

    res.json({
      message: 'Tokens refreshed successfully',
      tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: error.message,
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
);

// Customer logout
router.post('/logout', async (req, res) => {
  try {
    // In a real implementation, you would invalidate the token
    // For now, we'll just return success
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

// Admin logout
router.post('/admin/logout', auth.authenticateAdmin, async (req, res) => {
  try {
    // In a real implementation, you would invalidate the token
    // For now, we'll just return success
    res.json({
      message: 'Admin logout successful'
    });

  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      error: 'Admin logout failed',
      code: 'ADMIN_LOGOUT_ERROR'
    });
  }
});

// Get current customer profile
router.get('/profile', auth.authenticateCustomer, async (req, res) => {
  try {
    const result = await database.query(
      `SELECT c.id, c.email, c.first_name, c.last_name, c.phone, 
              c.accepts_marketing, c.email_verified, c.created_at, c.last_login_at,
              cp.currency, cp.language, cp.timezone
       FROM customers c
       LEFT JOIN customer_preferences cp ON c.id = cp.customer_id
       WHERE c.id = $1`,
      [req.customer.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    const customer = result.rows[0];

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        acceptsMarketing: customer.accepts_marketing,
        emailVerified: customer.email_verified,
        createdAt: customer.created_at,
        lastLoginAt: customer.last_login_at,
        preferences: {
          currency: customer.currency,
          language: customer.language,
          timezone: customer.timezone
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Update customer profile
router.put('/profile',
  auth.authenticateCustomer,
  async (req, res) => {
    try {
      const { firstName, lastName, phone, acceptsMarketing } = req.body;
      const customerId = req.customer.id;

      const result = await database.query(
        `UPDATE customers 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone = COALESCE($3, phone),
             accepts_marketing = COALESCE($4, accepts_marketing),
             updated_at = NOW()
         WHERE id = $5
         RETURNING id, email, first_name, last_name, phone, accepts_marketing, updated_at`,
        [firstName, lastName, phone, acceptsMarketing, customerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      const customer = result.rows[0];

      res.json({
        message: 'Profile updated successfully',
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
          acceptsMarketing: customer.accepts_marketing,
          updatedAt: customer.updated_at
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR'
      });
    }
  }
);

// Change password
router.put('/password',
  auth.authenticateCustomer,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Current password and new password required',
          code: 'PASSWORDS_REQUIRED'
        });
      }

      // Get current password hash
      const result = await database.query(
        'SELECT password_hash FROM customers WHERE id = $1',
        [req.customer.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      // Verify current password
      const isValidPassword = await auth.comparePassword(currentPassword, result.rows[0].password_hash);
      
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Hash new password
      const newPasswordHash = await auth.hashPassword(newPassword);

      // Update password
      await database.query(
        'UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, req.customer.id]
      );

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Failed to change password',
        code: 'PASSWORD_CHANGE_ERROR'
      });
    }
  }
);

// Request password reset
router.post('/forgot-password',
  security.validate({
    email: schemas.customerRegistration.extract('email')
  }),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Check if customer exists
      const result = await database.query(
        'SELECT id FROM customers WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal that customer doesn't exist
        return res.json({
          message: 'If an account exists, a password reset email has been sent'
        });
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update customer with reset token
      await database.query(
        'UPDATE customers SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [resetToken, resetExpires, result.rows[0].id]
      );

      // TODO: Send email with reset token
      console.log(`Password reset token for ${email}: ${resetToken}`);

      res.json({
        message: 'If an account exists, a password reset email has been sent'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Failed to process password reset',
        code: 'PASSWORD_RESET_ERROR'
      });
    }
  }
);

// Reset password
router.post('/reset-password',
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: 'Reset token and new password required',
          code: 'RESET_DATA_REQUIRED'
        });
      }

      // Find customer with valid reset token
      const result = await database.query(
        'SELECT id FROM customers WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN'
        });
      }

      // Hash new password
      const newPasswordHash = await auth.hashPassword(newPassword);

      // Update password and clear reset token
      await database.query(
        'UPDATE customers SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, result.rows[0].id]
      );

      res.json({
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Failed to reset password',
        code: 'PASSWORD_RESET_FAILED'
      });
    }
  }
);

module.exports = router;
