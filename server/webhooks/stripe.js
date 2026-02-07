/**
 * Stripe Webhook Handler
 * Handles payment notifications and events from Stripe
 */

const express = require('express');
const { paymentGatewayService } = require('../services/paymentGatewayService.js');
const { billingEngine } = require('../services/billingEngine.js');
const { subscriptionService } = require('../services/subscriptionService.js');
const { BillingRecord, Subscription, Company, User } = require('../models/index.js');

const router = express.Router();

/**
 * @route POST /webhooks/stripe
 * @desc Handle Stripe webhook events
 * @access Public (secured by signature verification)
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    console.log('[Stripe Webhook] Received event');

    // Verify and parse webhook
    const event = await paymentGatewayService.handleStripeWebhook(payload, signature);

    console.log('[Stripe Webhook] Event type:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Handle payment_intent.succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('[Stripe Webhook] Payment intent succeeded:', paymentIntent.id);

  const invoiceId = paymentIntent.metadata?.invoiceId;

  if (invoiceId) {
    await billingEngine.processPayment(invoiceId, {
      amount: paymentIntent.amount / 100, // Convert from cents
      paymentMethod: paymentIntent.payment_method,
      provider: 'stripe',
      transactionId: paymentIntent.id,
      metadata: {
        paymentMethodTypes: paymentIntent.payment_method_types,
        receiptEmail: paymentIntent.receipt_email,
      },
    });
  }
}

/**
 * Handle payment_intent.payment_failed
 */
async function handlePaymentIntentFailed(paymentIntent) {
  console.log('[Stripe Webhook] Payment intent failed:', paymentIntent.id);

  const invoiceId = paymentIntent.metadata?.invoiceId;

  if (invoiceId) {
    await billingEngine.recordFailedPayment(invoiceId, {
      reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      provider: 'stripe',
      attemptNumber: 1,
    });
  }
}

/**
 * Handle invoice.payment_succeeded
 */
async function handleInvoicePaymentSucceeded(stripeInvoice) {
  console.log('[Stripe Webhook] Invoice payment succeeded:', stripeInvoice.id);

  // Find subscription by Stripe subscription ID
  const subscription = await Subscription.findOne({
    'metadata.stripeSubscriptionId': stripeInvoice.subscription,
  });

  if (subscription) {
    // Update subscription payment history
    subscription.paymentHistory.push({
      amount: stripeInvoice.amount_paid / 100,
      currency: stripeInvoice.currency.toUpperCase(),
      paymentMethod: 'stripe',
      transactionId: stripeInvoice.payment_intent,
      status: 'completed',
      paidAt: new Date(stripeInvoice.status_transitions.paid_at * 1000),
    });

    await subscription.save();
  }
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(stripeInvoice) {
  console.log('[Stripe Webhook] Invoice payment failed:', stripeInvoice.id);

  const subscription = await Subscription.findOne({
    'metadata.stripeSubscriptionId': stripeInvoice.subscription,
  });

  if (subscription) {
    // Update subscription status
    subscription.status = 'past_due';
    await subscription.save();

    // Update company subscription status
    if (subscription.companyId) {
      await Company.findByIdAndUpdate(subscription.companyId, {
        'currentSubscription.status': 'past_due',
      });
    }
  }
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(stripeSubscription) {
  console.log('[Stripe Webhook] Subscription created:', stripeSubscription.id);

  // This is typically handled by our API, but we can log it here
  console.log('[Stripe Webhook] Stripe subscription metadata:', stripeSubscription.metadata);
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(stripeSubscription) {
  console.log('[Stripe Webhook] Subscription updated:', stripeSubscription.id);

  const subscription = await Subscription.findOne({
    'metadata.stripeSubscriptionId': stripeSubscription.id,
  });

  if (subscription) {
    // Update subscription details
    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    if (stripeSubscription.cancel_at_period_end) {
      subscription.cancelAtPeriodEnd = true;
    }

    await subscription.save();
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(stripeSubscription) {
  console.log('[Stripe Webhook] Subscription deleted:', stripeSubscription.id);

  const subscription = await Subscription.findOne({
    'metadata.stripeSubscriptionId': stripeSubscription.id,
  });

  if (subscription) {
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();

    // Update company subscription status
    if (subscription.companyId) {
      await Company.findByIdAndUpdate(subscription.companyId, {
        'currentSubscription.status': 'cancelled',
      });
    }
  }
}

/**
 * Handle charge.refunded
 */
async function handleChargeRefunded(charge) {
  console.log('[Stripe Webhook] Charge refunded:', charge.id);

  // Find invoice by payment intent
  const invoice = await BillingRecord.findOne({
    'payment.transactionId': charge.payment_intent,
  });

  if (invoice) {
    invoice.refundAmount = charge.amount_refunded / 100;
    invoice.refundedAt = new Date();
    invoice.status = 'refunded';
    await invoice.save();
  }
}

module.exports = router;
