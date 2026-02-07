const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Get email analytics
router.get('/analytics', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      campaignId, 
      customerId,
      eventType 
    } = req.query;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND ea.timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND ea.timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (campaignId) {
      whereClause += ` AND eq.campaign_id = $${paramIndex++}`;
      params.push(campaignId);
    }

    if (customerId) {
      whereClause += ` AND eq.customer_id = $${paramIndex++}`;
      params.push(customerId);
    }

    if (eventType) {
      whereClause += ` AND ea.event_type = $${paramIndex++}`;
      params.push(eventType);
    }

    const stats = await database.query(`
      SELECT 
        ec.name as campaign_name,
        ec.type as campaign_type,
        COUNT(eq.id) as sent,
        COUNT(CASE WHEN ea.event_type = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN ea.event_type = 'opened' THEN 1 END) as opened,
        COUNT(CASE WHEN ea.event_type = 'clicked' THEN 1 END) as clicked,
        COUNT(CASE WHEN ea.event_type = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN ea.event_type = 'unsubscribed' THEN 1 END) as unsubscribed,
        COUNT(CASE WHEN ea.event_type = 'failed' THEN 1 END) as failed,
        ROUND(
          COUNT(CASE WHEN ea.event_type = 'opened' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN ea.event_type = 'delivered' THEN 1 END), 0), 2
        ) as open_rate,
        ROUND(
          COUNT(CASE WHEN ea.event_type = 'clicked' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN ea.event_type = 'opened' THEN 1 END), 0), 2
        ) as click_rate
      FROM email_campaigns ec
      LEFT JOIN email_queue eq ON ec.id = eq.campaign_id
      LEFT JOIN email_analytics ea ON eq.id = ea.email_queue_id
      WHERE ${whereClause}
      GROUP BY ec.id, ec.name, ec.type
      ORDER BY ec.created_at DESC
    `, params);

    res.json({
      success: true,
      data: stats.rows,
      total: stats.rows.length
    });

  } catch (error) {
    console.error('Email analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch email analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// Get email queue status
router.get('/queue/status', async (req, res) => {
  try {
    const status = await database.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN scheduled_at <= NOW() THEN 1 END) as ready_to_send
      FROM email_queue
      GROUP BY status
      ORDER BY status
    `);

    res.json({
      success: true,
      data: status.rows
    });

  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({
      error: 'Failed to fetch queue status',
      code: 'QUEUE_STATUS_ERROR'
    });
  }
});

// Get customer email preferences
router.get('/customers/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params;

    const preferences = await database.query(`
      SELECT email_type, is_enabled, created_at, updated_at
      FROM customer_email_preferences
      WHERE customer_id = $1
    `, [id]);

    res.json({
      success: true,
      data: preferences.rows
    });

  } catch (error) {
    console.error('Customer preferences error:', error);
    res.status(500).json({
      error: 'Failed to fetch customer preferences',
      code: 'PREFERENCES_ERROR'
    });
  }
});

// Update customer email preferences
router.put('/customers/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params;
    const { preferences } = req.body;

    for (const pref of preferences) {
      await database.query(`
        INSERT INTO customer_email_preferences (customer_id, email_type, is_enabled)
        VALUES ($1, $2, $3)
        ON CONFLICT (customer_id, email_type)
        DO UPDATE SET 
          is_enabled = EXCLUDED.is_enabled,
          updated_at = NOW()
      `, [id, pref.email_type, pref.is_enabled]);
    }

    res.json({
      success: true,
      message: 'Email preferences updated successfully'
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Failed to update email preferences',
      code: 'UPDATE_PREFERENCES_ERROR'
    });
  }
});

// Track email open (pixel tracking)
router.get('/track/open/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    await database.query(
      'INSERT INTO email_analytics (email_queue_id, event_type, event_data) VALUES ($1, $2, $3)',
      [queueId, 'opened', { userAgent, ip, timestamp: new Date() }]
    );

    // Return 1x1 transparent pixel
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));

  } catch (error) {
    console.error('Track open error:', error);
    res.status(404).send('Not found');
  }
});

// Track email click
router.get('/track/click/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const { url } = req.query;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    await database.query(
      'INSERT INTO email_analytics (email_queue_id, event_type, event_data) VALUES ($1, $2, $3)',
      [queueId, 'clicked', { url, userAgent, ip, timestamp: new Date() }]
    );

    // Redirect to original URL
    res.redirect(302, url || '/');

  } catch (error) {
    console.error('Track click error:', error);
    res.status(404).send('Not found');
  }
});

// Unsubscribe from emails
router.get('/unsubscribe/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { type = 'marketing' } = req.query;

    // Add to suppression list
    await database.query(
      'INSERT INTO email_suppressions (email, reason, details) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      [email, 'unsubscribe', { type, timestamp: new Date() }]
    );

    // Show unsubscribe confirmation page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          .success { color: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">Successfully Unsubscribed</h1>
          <p>You have been unsubscribed from ${type} emails.</p>
          <p>We're sorry to see you go! If you change your mind, you can always resubscribe in your account settings.</p>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send('Error processing unsubscribe request');
  }
});

module.exports = router;
