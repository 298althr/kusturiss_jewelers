const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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

// Get all offers
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'active', 
      type 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE o.status = $1';
    const params = [status];

    if (type) {
      whereClause += ' AND o.type = $2';
      params.push(type);
    }

    const offersResult = await database.query(
      `SELECT o.*, 
              (SELECT COUNT(*) FROM offer_usage WHERE offer_id = o.id) as usage_count
       FROM offers o
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await database.query(
      `SELECT COUNT(*) as total FROM offers o ${whereClause}`,
      params
    );

    res.json({
      offers: offersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      error: 'Failed to get offers',
      code: 'OFFERS_GET_ERROR'
    });
  }
});

// Get offer by ID
router.get('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const offerResult = await database.query(
      `SELECT o.*, 
              (SELECT COUNT(*) FROM offer_usage WHERE offer_id = o.id) as usage_count
       FROM offers o
       WHERE o.id = $1`,
      [id]
    );

    if (offerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    const offer = offerResult.rows[0];

    // Get offer codes
    const codesResult = await database.query(
      'SELECT * FROM offer_codes WHERE offer_id = $1',
      [id]
    );

    res.json({
      offer: {
        ...offer,
        codes: codesResult.rows
      }
    });

  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({
      error: 'Failed to get offer',
      code: 'OFFER_GET_ERROR'
    });
  }
});

// Create new offer
router.post('/', [
  body('name').trim().isLength({ min: 1 }),
  body('description').optional().isString(),
  body('type').isIn(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y']),
  body('value').isFloat({ min: 0 }),
  body('minimum_amount').optional().isFloat({ min: 0 }),
  body('usage_limit_per_customer').optional().isInt({ min: 1 }),
  body('usage_limit_total').optional().isInt({ min: 1 }),
  body('start_date').isISO8601().toDate(),
  body('end_date').optional().isISO8601().toDate(),
  body('applicable_products').optional().isArray(),
  body('applicable_categories').optional().isArray(),
  body('excluded_products').optional().isArray(),
  body('auto_apply').optional().isBoolean(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      value,
      minimum_amount = 0,
      usage_limit_per_customer,
      usage_limit_total,
      start_date,
      end_date,
      applicable_products = [],
      applicable_categories = [],
      excluded_products = [],
      auto_apply = false
    } = req.body;

    const result = await database.query(
      `INSERT INTO offers (
        name, description, type, value, minimum_amount,
        usage_limit_per_customer, usage_limit_total, start_date, end_date,
        applicable_products, applicable_categories, excluded_products,
        auto_apply, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        name,
        description,
        type,
        value,
        minimum_amount,
        usage_limit_per_customer,
        usage_limit_total,
        start_date,
        end_date,
        JSON.stringify(applicable_products),
        JSON.stringify(applicable_categories),
        JSON.stringify(excluded_products),
        auto_apply,
        'active'
      ]
    );

    res.status(201).json({
      message: 'Offer created successfully',
      offer: result.rows[0]
    });

  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({
      error: 'Failed to create offer',
      code: 'OFFER_CREATION_ERROR'
    });
  }
});

// Update offer
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().isString(),
  body('type').optional().isIn(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y']),
  body('value').optional().isFloat({ min: 0 }),
  body('minimum_amount').optional().isFloat({ min: 0 }),
  body('usage_limit_per_customer').optional().isInt({ min: 1 }),
  body('usage_limit_total').optional().isInt({ min: 1 }),
  body('start_date').optional().isISO8601().toDate(),
  body('end_date').optional().isISO8601().toDate(),
  body('applicable_products').optional().isArray(),
  body('applicable_categories').optional().isArray(),
  body('excluded_products').optional().isArray(),
  body('auto_apply').optional().isBoolean(),
  body('status').optional().isIn(['active', 'inactive', 'expired']),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'applicable_products' || key === 'applicable_categories' || key === 'excluded_products') {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
      }
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await database.query(
      `UPDATE offers 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Offer updated successfully',
      offer: result.rows[0]
    });

  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({
      error: 'Failed to update offer',
      code: 'OFFER_UPDATE_ERROR'
    });
  }
});

// Delete offer
router.delete('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.query(
      'DELETE FROM offers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Offer deleted successfully'
    });

  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({
      error: 'Failed to delete offer',
      code: 'OFFER_DELETE_ERROR'
    });
  }
});

// Validate offer code
router.post('/validate-code', [
  body('code').trim().isLength({ min: 1 }),
  body('customer_id').optional().isUUID(),
  body('cart_total').optional().isFloat({ min: 0 }),
  body('products').optional().isArray(),
], handleValidationErrors, async (req, res) => {
  try {
    const { code, customer_id, cart_total = 0, products = [] } = req.body;

    // Find offer code
    const codeResult = await database.query(
      `SELECT oc.*, o.* 
       FROM offer_codes oc
       JOIN offers o ON oc.offer_id = o.id
       WHERE oc.code = $1 AND oc.status = 'active' AND o.status = 'active'`,
      [code.toUpperCase()]
    );

    if (codeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invalid offer code',
        code: 'INVALID_CODE'
      });
    }

    const offerCode = codeResult.rows[0];
    const offer = offerCode;

    // Check if offer is still valid
    const now = new Date();
    if (offer.start_date > now || (offer.end_date && offer.end_date < now)) {
      return res.status(400).json({
        error: 'Offer code has expired',
        code: 'EXPIRED_CODE'
      });
    }

    // Check minimum amount requirement
    if (offer.minimum_amount > 0 && cart_total < offer.minimum_amount) {
      return res.status(400).json({
        error: `Minimum order amount of $${offer.minimum_amount} required`,
        code: 'MINIMUM_AMOUNT_NOT_MET'
      });
    }

    // Check usage limits
    if (customer_id) {
      const usageResult = await database.query(
        'SELECT COUNT(*) as usage_count FROM offer_usage WHERE offer_id = $1 AND customer_id = $2',
        [offer.id, customer_id]
      );

      const customerUsage = usageResult.rows[0].usage_count;

      if (offer.usage_limit_per_customer && customerUsage >= offer.usage_limit_per_customer) {
        return res.status(400).json({
          error: 'Offer code usage limit exceeded',
          code: 'USAGE_LIMIT_EXCEEDED'
        });
      }
    }

    // Check total usage limit
    const totalUsageResult = await database.query(
      'SELECT COUNT(*) as total_usage FROM offer_usage WHERE offer_id = $1',
      [offer.id]
    );

    const totalUsage = totalUsageResult.rows[0].total_usage;

    if (offer.usage_limit_total && totalUsage >= offer.usage_limit_total) {
      return res.status(400).json({
        error: 'Offer code has been fully used',
        code: 'TOTAL_USAGE_EXCEEDED'
      });
    }

    // Calculate discount
    let discount_amount = 0;

    if (offer.type === 'percentage') {
      discount_amount = cart_total * (offer.value / 100);
    } else if (offer.type === 'fixed_amount') {
      discount_amount = Math.min(offer.value, cart_total);
    } else if (offer.type === 'free_shipping') {
      // Shipping discount handled separately
      discount_amount = 0;
    }

    res.json({
      valid: true,
      offer: {
        id: offer.id,
        name: offer.name,
        type: offer.type,
        value: offer.value,
        discount_amount
      }
    });

  } catch (error) {
    console.error('Validate offer code error:', error);
    res.status(500).json({
      error: 'Failed to validate offer code',
      code: 'CODE_VALIDATION_ERROR'
    });
  }
});

// Apply offer to order
router.post('/apply', [
  body('offer_id').isUUID(),
  body('customer_id').isUUID(),
  body('order_id').isUUID(),
  body('discount_amount').isFloat({ min: 0 }),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      offer_id,
      customer_id,
      order_id,
      discount_amount
    } = req.body;

    // Record offer usage
    const result = await database.query(
      `INSERT INTO offer_usage (
        offer_id, customer_id, order_id, discount_amount, used_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [offer_id, customer_id, order_id, discount_amount]
    );

    res.status(201).json({
      message: 'Offer applied successfully',
      usage: result.rows[0]
    });

  } catch (error) {
    console.error('Apply offer error:', error);
    res.status(500).json({
      error: 'Failed to apply offer',
      code: 'OFFER_APPLY_ERROR'
    });
  }
});

module.exports = router;
