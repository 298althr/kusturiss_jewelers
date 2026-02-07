const Redis = require('redis');
const emailService = require('./emailService');
const database = require('../config/database');

class EmailQueue {
  constructor() {
    this.redis = Redis.createClient(process.env.REDIS_URL);
    this.redis.connect().catch(err => {
      console.warn('Redis not available for email queue:', err.message);
    });
    this.processing = false;
    this.maxRetries = 3;
    this.batchSize = parseInt(process.env.EMAIL_BATCH_SIZE) || 10;
  }

  async add(emailData) {
    const { priority = 5, delay = 0 } = emailData;
    
    const result = await database.query(
      `INSERT INTO email_queue 
       (campaign_id, customer_id, to_email, from_email, subject, html_content, text_content, template_data, priority, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '${delay} milliseconds')
       RETURNING *`,
      [emailData.campaign_id, emailData.customer_id, emailData.to, emailData.from, 
       emailData.subject, emailData.html, emailData.text, emailData.template_data, priority]
    );

    // Add to Redis queue if available
    try {
      if (this.redis && this.redis.isReady) {
        await this.redis.zadd('email_queue', Date.now() + delay, result.rows[0].id);
      }
    } catch (redisError) {
      console.warn('Redis queue add failed:', redisError.message);
    }
    
    return result.rows[0];
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        const emails = await this.getEmailsToProcess();
        
        if (emails.length === 0) {
          await this.sleep(5000);
          continue;
        }

        await Promise.all(emails.map(email => this.processEmail(email)));
      }
    } finally {
      this.processing = false;
    }
  }

  async processEmail(email) {
    try {
      await emailService.sendEmail({
        queueId: email.id,
        customerId: email.customer_id,
        to: email.to_email,
        from: email.from_email,
        subject: email.subject,
        html: email.html_content,
        text: email.text_content,
        templateData: email.template_data,
        provider: email.provider
      });

      await database.query(
        'UPDATE email_queue SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', email.id]
      );

    } catch (error) {
      const attempts = email.attempts + 1;
      
      if (attempts >= this.maxRetries) {
        await database.query(
          'UPDATE email_queue SET status = $1, attempts = $2, last_error = $3 WHERE id = $4',
          ['failed', attempts, error.message, email.id]
        );
      } else {
        const delay = Math.pow(2, attempts) * 60000;
        await database.query(
          'UPDATE email_queue SET attempts = $1, last_error = $2, scheduled_at = NOW() + INTERVAL $3 WHERE id = $4',
          [attempts, error.message, `${delay} milliseconds`, email.id]
        );
      }
    }
  }

  async getEmailsToProcess() {
    const result = await database.query(
      `SELECT * FROM email_queue 
       WHERE status = 'pending' 
       AND scheduled_at <= NOW()
       ORDER BY priority ASC, scheduled_at ASC
       LIMIT $1`,
      [this.batchSize]
    );
    return result.rows;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new EmailQueue();
