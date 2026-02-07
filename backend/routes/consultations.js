const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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

// Create a consultation (Public)
router.post('/book', [
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().isMobilePhone(),
    body('appointment_date').isISO8601().toDate(),
    body('type').isIn(['virtual', 'in-person']),
    body('notes').optional().isString()
], handleValidationErrors, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, appointment_date, type, notes } = req.body;
        const customer_id = req.user ? req.user.id : null;

        const result = await database.query(`
      INSERT INTO consultations (
        customer_id, first_name, last_name, email, phone, appointment_date, type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [customer_id, first_name, last_name, email, phone, appointment_date, type, notes]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Consultation booked successfully'
        });
    } catch (error) {
        console.error('Consultation booking error:', error);
        res.status(500).json({ error: 'Failed to book consultation' });
    }
});

// Get my consultations (Auth)
router.get('/my-consultations', auth.authenticateCustomer, async (req, res) => {
    try {
        const result = await database.query(
            'SELECT * FROM consultations WHERE customer_id = $1 ORDER BY appointment_date DESC',
            [req.customer.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch consultations' });
    }
});

// Admin: Get all consultations
router.get('/admin/all', auth.authenticateAdmin, async (req, res) => {
    try {
        const result = await database.query('SELECT * FROM consultations ORDER BY appointment_date DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch consultations' });
    }
});

module.exports = router;
