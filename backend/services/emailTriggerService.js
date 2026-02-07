const emailQueue = require('./emailQueue');
const emailTemplateEngine = require('./emailTemplateEngine');
const database = require('../config/database');

class EmailTriggerService {
  constructor() {
    this.triggers = new Map();
    this.setupTriggers();
  }

  setupTriggers() {
    this.register('customer.registered', async (event) => {
      const { customer } = event;
      
      const campaign = await this.getActiveCampaign('welcome', 'customer.registered');
      if (!campaign) return;

      const template = await emailTemplateEngine.render('welcome-email-1', {
        customer,
        storeName: process.env.STORE_NAME || 'Your Store',
        discountCode: 'WELCOME10',
        expiryDays: 7,
        storeUrl: process.env.FRONTEND_URL
      });

      await emailQueue.add({
        campaign_id: campaign.id,
        customer_id: customer.id,
        to: customer.email,
        from: process.env.FROM_EMAIL || 'noreply@yourstore.com',
        subject: `Welcome to ${process.env.STORE_NAME || 'Your Store'}! Here's 10% off your first order`,
        html: template.html,
        text: template.text,
        priority: 1
      });
    });

    this.register('cart.abandoned', async (event) => {
      const { cart, customer } = event;
      
      if (!cart.items || cart.items.length === 0) return;

      const campaign = await this.getActiveCampaign('abandoned_cart', 'cart.abandoned');
      if (!campaign) return;

      const template = await emailTemplateEngine.render('abandoned-cart-1', {
        customer,
        cart,
        storeName: process.env.STORE_NAME || 'Your Store',
        storeUrl: process.env.FRONTEND_URL
      });

      await emailQueue.add({
        campaign_id: campaign.id,
        customer_id: customer.id,
        to: customer.email,
        from: process.env.FROM_EMAIL || 'noreply@yourstore.com',
        subject: 'Did you forget something?',
        html: template.html,
        text: template.text,
        delay: 60 * 60 * 1000, // 1 hour
        priority: 3
      });
    });

    this.register('order.placed', async (event) => {
      const { order, customer } = event;
      
      const campaign = await this.getActiveCampaign('transactional', 'order.placed');
      if (!campaign) return;

      const template = await emailTemplateEngine.render('order-confirmation', {
        customer,
        order,
        storeName: process.env.STORE_NAME || 'Your Store',
        storeUrl: process.env.FRONTEND_URL
      });

      await emailQueue.add({
        campaign_id: campaign.id,
        customer_id: customer.id,
        to: customer.email,
        from: process.env.FROM_EMAIL || 'noreply@yourstore.com',
        subject: `Order #${order.id} Confirmation`,
        html: template.html,
        text: template.text,
        priority: 1
      });
    });

    this.register('password.reset', async (event) => {
      const { customer, resetUrl } = event;
      
      const campaign = await this.getActiveCampaign('transactional', 'password.reset');
      if (!campaign) return;

      const template = await emailTemplateEngine.render('password-reset', {
        customer,
        resetUrl,
        expiryHours: 24,
        storeName: process.env.STORE_NAME
      });

      await emailQueue.add({
        campaign_id: campaign.id,
        customer_id: customer.id,
        to: customer.email,
        from: process.env.FROM_EMAIL || 'noreply@yourstore.com',
        subject: `Reset your ${process.env.STORE_NAME} password`,
        html: template.html,
        text: template.text,
        priority: 1
      });
    });

    this.register('payment.failed', async (event) => {
      const { order, customer } = event;
      
      const campaign = await this.getActiveCampaign('transactional', 'payment.failed');
      if (!campaign) return;

      const template = await emailTemplateEngine.render('payment-failed', {
        customer,
        order,
        storeName: process.env.STORE_NAME || 'Your Store',
        storeUrl: process.env.FRONTEND_URL
      });

      await emailQueue.add({
        campaign_id: campaign.id,
        customer_id: customer.id,
        to: customer.email,
        from: process.env.FROM_EMAIL || 'noreply@yourstore.com',
        subject: 'Payment Failed - Please Update Your Information',
        html: template.html,
        text: template.text,
        priority: 1
      });
    });
  }

  register(eventType, handler) {
    if (!this.triggers.has(eventType)) {
      this.triggers.set(eventType, []);
    }
    this.triggers.get(eventType).push(handler);
  }

  async processEvent(event) {
    console.log(`📧 Processing email trigger event: ${event.type}`);
    const handlers = this.triggers.get(event.type) || [];
    
    for (const handler of handlers) {
      try {
        console.log(`📧 Executing handler for ${event.type}`);
        await handler(event);
        console.log(`✅ Email trigger handler completed for ${event.type}`);
      } catch (error) {
        console.error(`❌ Email trigger failed for event ${event.type}:`, error);
      }
    }
  }

  async getActiveCampaign(type, triggerEvent) {
    const result = await database.query(
      `SELECT ec.*, et.name as template_name 
       FROM email_campaigns ec 
       LEFT JOIN email_templates et ON ec.template_id = et.id 
       WHERE ec.type = $1 
       AND ec.trigger_event = $2 
       AND ec.status = 'active'
       AND ec.config->>'enabled' = 'true'`,
      [type, triggerEvent]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

module.exports = new EmailTriggerService();
