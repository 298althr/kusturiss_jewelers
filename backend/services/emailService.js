const nodemailer = require('nodemailer');
const SendGrid = require('@sendgrid/mail');
const AWS = require('aws-sdk');
const database = require('../config/database');

class EmailService {
  constructor() {
    this.providers = {
      sendgrid: new SendGridService(),
      ses: new SESService(),
      nodemailer: new NodemailerService()
    };
    this.defaultProvider = process.env.EMAIL_PROVIDER || 'nodemailer'; // Use nodemailer for testing
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourstore.com';
    this.fromName = process.env.FROM_NAME || 'Your Store';
  }

  async sendEmail(options) {
    const { 
      to, 
      subject, 
      html, 
      text, 
      templateData = {}, 
      provider = this.defaultProvider,
      queueId = null,
      customerId = null 
    } = options;
    
    try {
      // Check if email is suppressed
      if (await this.isSuppressed(to)) {
        throw new Error('Email address is suppressed');
      }

      // Check customer preferences
      if (customerId && !(await this.canSendEmail(customerId, 'marketing'))) {
        throw new Error('Customer has opted out of marketing emails');
      }

      const result = await this.providers[provider].send({
        to,
        from: `${this.fromName} <${this.fromEmail}>`,
        subject,
        html,
        text,
        templateData
      });
      
      if (queueId) {
        await this.logAnalytics(queueId, 'sent', { provider, messageId: result.messageId });
      }
      
      console.log(`✅ Email sent successfully to ${to} via ${provider}`);
      return result;
    } catch (error) {
      console.error(`❌ Email send failed to ${to}:`, error.message);
      
      if (queueId) {
        await this.logAnalytics(queueId, 'failed', { error: error.message, provider });
      }
      
      // Add to suppression list for hard bounces
      if (error.message.includes('bounce') || error.message.includes('invalid')) {
        await this.addToSuppression(to, 'bounce', { error: error.message });
      }
      
      throw error;
    }
  }

  async isSuppressed(email) {
    const result = await database.query(
      'SELECT id FROM email_suppressions WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  }

  async canSendEmail(customerId, emailType) {
    const result = await database.query(
      'SELECT is_enabled FROM customer_email_preferences WHERE customer_id = $1 AND email_type = $2',
      [customerId, emailType]
    );
    return result.rows.length === 0 || result.rows[0].is_enabled;
  }

  async addToSuppression(email, reason, details = {}) {
    await database.query(
      'INSERT INTO email_suppressions (email, reason, details) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      [email, reason, details]
    );
  }

  async logAnalytics(queueId, eventType, data = {}) {
    await database.query(
      'INSERT INTO email_analytics (email_queue_id, event_type, event_data) VALUES ($1, $2, $3)',
      [queueId, eventType, data]
    );
  }

  async trackOpen(queueId, userAgent, ip) {
    await this.logAnalytics(queueId, 'opened', { userAgent, ip, timestamp: new Date() });
  }

  async trackClick(queueId, url, userAgent, ip) {
    await this.logAnalytics(queueId, 'clicked', { url, userAgent, ip, timestamp: new Date() });
  }
}

// SendGrid Provider
class SendGridService {
  constructor() {
    SendGrid.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async send(options) {
    const msg = {
      to: options.to,
      from: options.from,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const result = await SendGrid.send(msg);
    return { messageId: result.headers['x-message-id'], provider: 'sendgrid' };
  }
}

// AWS SES Provider
class SESService {
  constructor() {
    this.ses = new AWS.SES({
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_SES_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SES_SECRET_KEY
    });
  }

  async send(options) {
    const params = {
      Source: options.from,
      Destination: { ToAddresses: [options.to] },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: { Data: options.html },
          Text: { Data: options.text }
        }
      }
    };

    const result = await this.ses.sendEmail(params).promise();
    return { messageId: result.MessageId, provider: 'ses' };
  }
}

// Nodemailer Provider (for development/testing)
class NodemailerService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async send(options) {
    const result = await this.transporter.sendMail(options);
    return { messageId: result.messageId, provider: 'nodemailer' };
  }
}

module.exports = new EmailService();
