const express = require('express');
const { body, param, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

// Create payment intent
router.post('/create-payment-intent', [
  body('amount').isFloat({ min: 0.5 }),
  body('currency').optional().isIn(['usd', 'eur', 'gbp']),
  body('customer_id').optional().isUUID(),
  body('metadata').optional().isObject(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      amount,
      currency = 'usd',
      customer_id,
      metadata = {}
    } = req.body;

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata: {
        ...metadata,
        customer_id: customer_id || 'guest'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: amount,
      currency: currency
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      code: 'PAYMENT_INTENT_ERROR',
      message: error.message
    });
  }
});

// Create payment intent for checkout
router.post('/checkout-payment-intent', [
  body('checkout_session_id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { checkout_session_id } = req.body;

    // Get checkout session
    const checkoutResult = await database.query(
      'SELECT * FROM checkout_sessions WHERE id = $1 AND status = $2',
      [checkout_session_id, 'pending']
    );

    if (checkoutResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Checkout session not found or already processed',
        code: 'CHECKOUT_SESSION_NOT_FOUND'
      });
    }

    const checkoutSession = checkoutResult.rows[0];

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(checkoutSession.total_amount * 100),
      currency: 'usd',
      metadata: {
        checkout_session_id: checkoutSession.id,
        customer_id: checkoutSession.customer_id || 'guest'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update checkout session with payment intent ID
    await database.query(
      'UPDATE checkout_sessions SET payment_intent_id = $1, updated_at = NOW() WHERE id = $2',
      [paymentIntent.id, checkoutSession.id]
    );

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: checkoutSession.total_amount,
      currency: 'usd'
    });

  } catch (error) {
    console.error('Create checkout payment intent error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      code: 'PAYMENT_INTENT_ERROR',
      message: error.message
    });
  }
});

// Confirm payment
router.post('/confirm-payment', [
  body('payment_intent_id').isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not successful',
        code: 'PAYMENT_NOT_SUCCESSFUL',
        status: paymentIntent.status
      });
    }

    // Update checkout session if applicable
    if (paymentIntent.metadata.checkout_session_id) {
      await database.query(
        'UPDATE checkout_sessions SET status = $1, updated_at = NOW() WHERE id = $2',
        ['paid', paymentIntent.metadata.checkout_session_id]
      );
    }

    res.json({
      message: 'Payment confirmed successfully',
      payment_intent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      code: 'PAYMENT_CONFIRM_ERROR',
      message: error.message
    });
  }
});

// Create customer in Stripe
router.post('/create-customer', [
  body('email').isEmail().normalizeEmail(),
  body('name').optional().isString(),
  body('customer_id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, name, customer_id } = req.body;

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        customer_id
      }
    });

    // Update customer record with Stripe customer ID
    await database.query(
      'UPDATE customers SET stripe_customer_id = $1 WHERE id = $2',
      [customer.id, customer_id]
    );

    res.json({
      stripe_customer_id: customer.id,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name
      }
    });

  } catch (error) {
    console.error('Create Stripe customer error:', error);
    res.status(500).json({
      error: 'Failed to create customer',
      code: 'CUSTOMER_CREATE_ERROR',
      message: error.message
    });
  }
});

// Get payment methods for customer
router.get('/payment-methods/:customer_id', [
  param('customer_id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { customer_id } = req.params;

    // Get customer's Stripe customer ID
    const customerResult = await database.query(
      'SELECT stripe_customer_id FROM customers WHERE id = $1',
      [customer_id]
    );

    if (customerResult.rows.length === 0 || !customerResult.rows[0].stripe_customer_id) {
      return res.json({
        payment_methods: []
      });
    }

    const stripeCustomerId = customerResult.rows[0].stripe_customer_id;

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    res.json({
      payment_methods: paymentMethods.data.map(method => ({
        id: method.id,
        type: method.type,
        card: {
          brand: method.card.brand,
          last4: method.card.last4,
          exp_month: method.card.exp_month,
          exp_year: method.card.exp_year
        },
        created: method.created
      }))
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      error: 'Failed to get payment methods',
      code: 'PAYMENT_METHODS_ERROR',
      message: error.message
    });
  }
});

// Attach payment method to customer
router.post('/attach-payment-method', [
  body('payment_method_id').isString(),
  body('customer_id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { payment_method_id, customer_id } = req.body;

    // Get customer's Stripe customer ID
    const customerResult = await database.query(
      'SELECT stripe_customer_id FROM customers WHERE id = $1',
      [customer_id]
    );

    if (customerResult.rows.length === 0 || !customerResult.rows[0].stripe_customer_id) {
      return res.status(404).json({
        error: 'Customer not found or no Stripe customer ID',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    const stripeCustomerId = customerResult.rows[0].stripe_customer_id;

    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(
      payment_method_id,
      { customer: stripeCustomerId }
    );

    res.json({
      message: 'Payment method attached successfully',
      payment_method: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year
        }
      }
    });

  } catch (error) {
    console.error('Attach payment method error:', error);
    res.status(500).json({
      error: 'Failed to attach payment method',
      code: 'PAYMENT_METHOD_ATTACH_ERROR',
      message: error.message
    });
  }
});

// Create refund
router.post('/refund', [
  body('payment_intent_id').isString(),
  body('amount').optional().isFloat({ min: 0.5 }),
  body('reason').optional().isIn(['duplicate', 'fraudulent', 'requested_by_customer']),
], handleValidationErrors, async (req, res) => {
  try {
    const { payment_intent_id, amount, reason } = req.body;

    const refundParams = {
      payment_intent: payment_intent_id,
      reason: reason || 'requested_by_customer'
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    // Create refund
    const refund = await stripe.refunds.create(refundParams);

    res.json({
      message: 'Refund created successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      }
    });

  } catch (error) {
    console.error('Create refund error:', error);
    res.status(500).json({
      error: 'Failed to create refund',
      code: 'REFUND_ERROR',
      message: error.message
    });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Update checkout session if applicable
      if (paymentIntent.metadata.checkout_session_id) {
        await database.query(
          'UPDATE checkout_sessions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['paid', paymentIntent.metadata.checkout_session_id]
        );
      }

      // Update order status if payment_intent_id exists in orders
      await database.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE payment_intent_id = $2',
        ['confirmed', paymentIntent.id]
      );

      console.log(`PaymentIntent ${paymentIntent.id} succeeded.`);
      break;

    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      
      // Update checkout session status
      if (failedPaymentIntent.metadata.checkout_session_id) {
        await database.query(
          'UPDATE checkout_sessions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['failed', failedPaymentIntent.metadata.checkout_session_id]
        );
      }

      console.log(`PaymentIntent ${failedPaymentIntent.id} failed.`);
      break;

    case 'payment_intent.canceled':
      const canceledPaymentIntent = event.data.object;
      
      // Update checkout session status
      if (canceledPaymentIntent.metadata.checkout_session_id) {
        await database.query(
          'UPDATE checkout_sessions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['canceled', canceledPaymentIntent.metadata.checkout_session_id]
        );
      }

      console.log(`PaymentIntent ${canceledPaymentIntent.id} canceled.`);
      break;

    case 'charge.dispute.created':
      const dispute = event.data.object;
      console.log(`Dispute ${dispute.id} created for charge ${dispute.charge}.`);
      // Here you would typically notify admin and update order status
      break;

    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

module.exports = router;
