const express = require('express');
const database = require('../config/database');

const router = express.Router();

// Simple test endpoint without authentication
router.get('/test', async (req, res) => {
  try {
    const result = await database.query('SELECT COUNT(*) as count FROM customers');
    res.json({
      success: true,
      message: 'Admin test endpoint working',
      customerCount: parseInt(result.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      code: 'TEST_ERROR'
    });
  }
});

module.exports = router;
