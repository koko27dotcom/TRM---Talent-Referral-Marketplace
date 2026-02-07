/**
 * 2C2P Webhook Handler
 * Handles payment notifications and callbacks from 2C2P payment gateway
 */

const express = require('express');
const { paymentGatewayService } = require('../services/paymentGatewayService.js');
const { billingEngine } = require('../services/billingEngine.js');
const { BillingRecord, Subscription } = require('../models/index.js');

const router = express.Router();

/**
 * @route POST /webhooks/2c2p
 * @desc Handle 2C2P payment notifications
 * @access Public (secured by signature verification)
 */
router.post('/', async (req, res) => {
  try {
    console.log('[2C2P Webhook] Received:', req.body);

    // Verify webhook signature
    const isValid = paymentGatewayService.verifyTwoC2PResponse(req.body);

    if (!isValid) {
      console.error('[2C2P Webhook] Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse webhook data
    const webhookData = await paymentGatewayService.handleTwoC2PWebhook(req.body);

    console.log('[2C2P Webhook] Parsed:', webhookData);

    // Find invoice by invoice number
    const invoice = await BillingRecord.findOne({
      invoiceNumber: webhookData.invoiceNo,
    });

    if (!invoice) {
      console.error('[2C2P Webhook] Invoice not found:', webhookData.invoiceNo);
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Process based on status
    if (webhookData.status === 'success') {
      // Process successful payment
      await billingEngine.processPayment(invoice._id, {
        amount: webhookData.amount,
        paymentMethod: webhookData.paymentMethod || '2c2p',
        provider: '2c2p',
        transactionId: webhookData.transactionId,
        metadata: {
          paymentChannel: webhookData.paymentMethod,
          processedAt: webhookData.paidAt,
        },
      });

      console.log('[2C2P Webhook] Payment processed successfully:', invoice._id);
    } else {
      // Record failed payment
      await billingEngine.recordFailedPayment(invoice._id, {
        reason: 'Payment failed',
        provider: '2c2p',
        attemptNumber: 1,
      });

      console.log('[2C2P Webhook] Payment failed:', invoice._id);
    }

    // Acknowledge receipt
    res.json({ status: 'received' });
  } catch (error) {
    console.error('[2C2P Webhook] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /webhooks/2c2p/redirect
 * @desc Handle 2C2P redirect after payment
 * @access Public
 */
router.post('/redirect', async (req, res) => {
  try {
    const { order_id, status, hash_value } = req.body;

    console.log('[2C2P Redirect] Received:', req.body);

    // Verify response
    const isValid = paymentGatewayService.verifyTwoC2PResponse(req.body);

    if (!isValid) {
      console.error('[2C2P Redirect] Invalid signature');
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?reason=invalid_signature`);
    }

    // Find invoice
    const invoice = await BillingRecord.findOne({ invoiceNumber: order_id });

    if (!invoice) {
      console.error('[2C2P Redirect] Invoice not found:', order_id);
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?reason=invoice_not_found`);
    }

    // Redirect based on status
    if (status === '000') {
      // Success
      res.redirect(`${process.env.FRONTEND_URL}/payment/success?invoice=${invoice._id}`);
    } else {
      // Failure
      res.redirect(`${process.env.FRONTEND_URL}/payment/failed?invoice=${invoice._id}&code=${status}`);
    }
  } catch (error) {
    console.error('[2C2P Redirect] Error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
});

module.exports = router;
