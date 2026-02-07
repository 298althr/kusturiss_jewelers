const express = require('express');
const { body, param, validationResult } = require('express-validator');
const database = require('../config/database');
const auth = require('../middleware/auth');

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

// Create admin user
router.post('/create', auth.authenticateAdmin, auth.requireRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('firstName').trim().isLength({ min: 1, max: 100 }),
  body('lastName').trim().isLength({ min: 1, max: 100 }),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['admin', 'manager', 'support'])
], handleValidationErrors, async (req, res) => {
  try {
    const { email, firstName, lastName, password, role } = req.body;

    // Check if admin already exists
    const existingAdmin = await database.query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({
        error: 'Admin with this email already exists',
        code: 'ADMIN_EXISTS'
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin
    const result = await database.query(
      `INSERT INTO admins (email, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [email, firstName, lastName, hashedPassword, role]
    );

    // Log the creation
    await database.query(
      'INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'create_admin', 'admin', result.rows[0].id, { email, role }]
    );

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        role: result.rows[0].role,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      error: 'Failed to create admin',
      code: 'CREATE_ADMIN_ERROR'
    });
  }
});

// Get all admins
router.get('/', auth.authenticateAdmin, auth.requireRole(['admin']), async (req, res) => {
  try {
    const result = await database.query(`
      SELECT 
        id, email, first_name, last_name, role, is_active, last_login_at, created_at
      FROM admins
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      error: 'Failed to fetch admins',
      code: 'GET_ADMINS_ERROR'
    });
  }
});

// Update admin status
router.put('/:id/status', auth.authenticateAdmin, auth.requireRole(['admin']), [
  param('id').isUUID(),
  body('isActive').isBoolean(),
  body('reason').optional().isString()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    // Prevent admin from deactivating themselves
    if (id === req.admin.id && !isActive) {
      return res.status(400).json({
        error: 'You cannot deactivate your own account',
        code: 'CANNOT_DEACTIVATE_SELF'
      });
    }

    const result = await database.query(
      'UPDATE admins SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active',
      [isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Log the status change
    await database.query(
      'INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'update_admin_status', 'admin', id, { isActive, reason }]
    );

    res.json({
      success: true,
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({
      error: 'Failed to update admin status',
      code: 'UPDATE_ADMIN_STATUS_ERROR'
    });
  }
});

// Update admin role
router.put('/:id/role', auth.authenticateAdmin, auth.requireRole(['admin']), [
  param('id').isUUID(),
  body('role').isIn(['admin', 'manager', 'support']),
  body('reason').optional().isString()
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, reason } = req.body;

    // Prevent admin from changing their own role to a lower level
    if (id === req.admin.id && role !== 'admin') {
      return res.status(400).json({
        error: 'You cannot change your own role to a lower level',
        code: 'CANNOT_CHANGE_OWN_ROLE'
      });
    }

    const result = await database.query(
      'UPDATE admins SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Log the role change
    await database.query(
      'INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'update_admin_role', 'admin', id, { role, reason }]
    );

    res.json({
      success: true,
      message: 'Admin role updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update admin role error:', error);
    res.status(500).json({
      error: 'Failed to update admin role',
      code: 'UPDATE_ADMIN_ROLE_ERROR'
    });
  }
});

// Reset admin password
router.post('/:id/reset-password', auth.authenticateAdmin, auth.requireRole(['admin']), [
  param('id').isUUID(),
  body('newPassword').isLength({ min: 8 })
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Hash new password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await database.query(
      'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Log the password reset
    await database.query(
      'INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'reset_admin_password', 'admin', id, { resetBy: req.admin.email }]
    );

    res.json({
      success: true,
      message: 'Admin password reset successfully',
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email
      }
    });

  } catch (error) {
    console.error('Reset admin password error:', error);
    res.status(500).json({
      error: 'Failed to reset admin password',
      code: 'RESET_ADMIN_PASSWORD_ERROR'
    });
  }
});

// Get admin profile
router.get('/profile', auth.authenticateAdmin, async (req, res) => {
  try {
    const result = await database.query(
      `SELECT 
        id, email, first_name, last_name, role, is_active, last_login_at, created_at
      FROM admins
      WHERE id = $1`,
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch admin profile',
      code: 'GET_ADMIN_PROFILE_ERROR'
    });
  }
});

// Update admin profile
router.put('/profile', auth.authenticateAdmin, [
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  body('currentPassword').optional().isLength({ min: 8 }),
  body('newPassword').optional().isLength({ min: 8 })
], handleValidationErrors, async (req, res) => {
  try {
    const { firstName, lastName, currentPassword, newPassword } = req.body;
    const updateFields = [];
    const updateValues = [req.admin.id];
    let paramIndex = 2;

    if (firstName) {
      updateFields.push(`first_name = $${paramIndex}`);
      updateValues.push(firstName);
      paramIndex++;
    }

    if (lastName) {
      updateFields.push(`last_name = $${paramIndex}`);
      updateValues.push(lastName);
      paramIndex++;
    }

    // Handle password change
    if (currentPassword && newPassword) {
      // Verify current password
      const bcrypt = require('bcrypt');
      const currentAdmin = await database.query(
        'SELECT password_hash FROM admins WHERE id = $1',
        [req.admin.id]
      );

      if (currentAdmin.rows.length === 0) {
        return res.status(404).json({
          error: 'Admin not found',
          code: 'ADMIN_NOT_FOUND'
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, currentAdmin.rows[0].password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      updateFields.push(`password_hash = $${paramIndex}`);
      updateValues.push(hashedNewPassword);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    updateFields.push('updated_at = NOW()');

    const result = await database.query(
      `UPDATE admins SET ${updateFields.join(', ')} WHERE id = $1 RETURNING id, email, first_name, last_name, updated_at`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      error: 'Failed to update admin profile',
      code: 'UPDATE_ADMIN_PROFILE_ERROR'
    });
  }
});

module.exports = router;
