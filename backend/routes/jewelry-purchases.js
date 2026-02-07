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

// Submit an offer (Auth required)
router.post('/submit', auth.authenticateCustomer, [
    body('item_type').notEmpty(),
    body('material').notEmpty(),
    body('description').notEmpty(),
    body('images').optional().isArray()
], handleValidationErrors, async (req, res) => {
    try {
        const { item_type, material, description, images = [] } = req.body;
        const customer_id = req.customer.id;

        const result = await database.query(`
      INSERT INTO jewelry_purchase_offers (
        customer_id, item_type, material, description, images
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [customer_id, item_type, material, description, JSON.stringify(images)]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Offer submitted for appraisal'
        });
    } catch (error) {
        console.error('Offer submission error:', error);
        res.status(500).json({ error: 'Failed to submit offer' });
    }
});

// Get my offers
router.get('/my-offers', auth.authenticateCustomer, async (req, res) => {
    try {
        const result = await database.query(
            'SELECT * FROM jewelry_purchase_offers WHERE customer_id = $1 ORDER BY created_at DESC',
            [req.customer.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

// Admin: Manage offers
router.get('/admin/all', auth.authenticateAdmin, async (req, res) => {
    try {
        const result = await database.query('SELECT * FROM jewelry_purchase_offers ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

module.exports = router;
