/**
 * External API Mocks
 * Mock implementations for external services
 */

const axios = require('axios');

// Mock axios
jest.mock('axios');

/**
 * Viber API Mocks
 */
const viberMocks = {
  sendMessage: jest.fn().mockResolvedValue({
    data: {
      status: 0,
      status_message: 'ok',
      message_token: 'viber_msg_token_123',
    },
  }),

  sendKeyboard: jest.fn().mockResolvedValue({
    data: {
      status: 0,
      status_message: 'ok',
      message_token: 'viber_keyboard_token_123',
    },
  }),

  setWebhook: jest.fn().mockResolvedValue({
    data: {
      status: 0,
      status_message: 'ok',
      event_types: ['delivered', 'seen', 'failed', 'subscribed', 'unsubscribed', 'conversation_started'],
    },
  }),

  getAccountInfo: jest.fn().mockResolvedValue({
    data: {
      status: 0,
      status_message: 'ok',
      id: 'viber_account_123',
      name: 'TRM Referral Platform',
      uri: 'trmreferral',
      icon: 'https://example.com/icon.png',
      background: 'https://example.com/bg.png',
      category: 'referral',
      subcategory: 'jobs',
      location: {
        lon: 96.1735,
        lat: 16.8661,
      },
      country: 'Myanmar',
      webhook: 'https://api.trm-referral.com/webhooks/viber',
      event_types: ['delivered', 'seen', 'failed'],
      subscribers_count: 1000,
      members: [],
    },
  }),
};

/**
 * Telegram API Mocks
 */
const telegramMocks = {
  sendMessage: jest.fn().mockResolvedValue({
    data: {
      ok: true,
      result: {
        message_id: 123,
        from: { id: 123456, is_bot: true, first_name: 'TRM Bot', username: 'trm_bot' },
        chat: { id: 789012, first_name: 'Test', type: 'private' },
        date: Date.now(),
        text: 'Test message',
      },
    },
  }),

  sendPhoto: jest.fn().mockResolvedValue({
    data: {
      ok: true,
      result: {
        message_id: 124,
        from: { id: 123456, is_bot: true, first_name: 'TRM Bot' },
        chat: { id: 789012, type: 'private' },
        date: Date.now(),
        photo: [{ file_id: 'photo_123', file_unique_id: 'unique_123', width: 640, height: 480 }],
      },
    },
  }),

  setWebhook: jest.fn().mockResolvedValue({
    data: {
      ok: true,
      result: true,
      description: 'Webhook was set',
    },
  }),

  getMe: jest.fn().mockResolvedValue({
    data: {
      ok: true,
      result: {
        id: 123456,
        is_bot: true,
        first_name: 'TRM Referral Bot',
        username: 'trm_referral_bot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: true,
      },
    },
  }),

  getUpdates: jest.fn().mockResolvedValue({
    data: {
      ok: true,
      result: [],
    },
  }),
};

/**
 * WhatsApp API Mocks
 */
const whatsappMocks = {
  sendMessage: jest.fn().mockResolvedValue({
    data: {
      messaging_product: 'whatsapp',
      contacts: [{ input: '+959123456789', wa_id: '959123456789' }],
      messages: [{ id: 'wamid.123456789' }],
    },
  }),

  sendTemplate: jest.fn().mockResolvedValue({
    data: {
      messaging_product: 'whatsapp',
      contacts: [{ input: '+959123456789', wa_id: '959123456789' }],
      messages: [{ id: 'wamid.template.123' }],
    },
  }),

  getMessageStatus: jest.fn().mockResolvedValue({
    data: {
      messaging_product: 'whatsapp',
      id: 'wamid.123456789',
      status: 'delivered',
      timestamp: Date.now(),
    },
  }),
};

/**
 * Stripe API Mocks
 */
const stripeMocks = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      object: 'payment_intent',
      amount: 100000,
      currency: 'mmk',
      status: 'requires_confirmation',
      client_secret: 'pi_test_123_secret',
    }),

    retrieve: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      object: 'payment_intent',
      amount: 100000,
      currency: 'mmk',
      status: 'succeeded',
      charges: {
        data: [{
          id: 'ch_test_123',
          status: 'succeeded',
          receipt_url: 'https://pay.stripe.com/receipts/test',
        }],
      },
    }),

    confirm: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      status: 'succeeded',
    }),

    cancel: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      status: 'canceled',
    }),
  },

  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      object: 'customer',
      email: 'test@example.com',
      name: 'Test Customer',
    }),

    retrieve: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      email: 'test@example.com',
    }),

    update: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      email: 'updated@example.com',
    }),
  },

  subscriptions: {
    create: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      object: 'subscription',
      status: 'active',
      current_period_start: Date.now() / 1000,
      current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60),
      customer: 'cus_test_123',
      items: {
        data: [{
          id: 'si_test_123',
          price: { id: 'price_test_123', unit_amount: 50000 },
        }],
      },
    }),

    retrieve: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      status: 'active',
    }),

    cancel: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      status: 'canceled',
    }),
  },

  webhooks: {
    constructEvent: jest.fn((payload, signature, secret) => {
      return JSON.parse(payload);
    }),
  },
};

/**
 * KBZPay API Mocks
 */
const kbzPayMocks = {
  createOrder: jest.fn().mockResolvedValue({
    Response: {
      ResultCode: '0',
      ResultMsg: 'Success',
      OrderId: `KBZ${Date.now()}`,
      PrepayId: 'prepay_123',
      NonceStr: 'nonce_123',
      Sign: 'sign_123',
      Timestamp: Date.now().toString(),
    },
  }),

  queryOrder: jest.fn().mockResolvedValue({
    Response: {
      ResultCode: '0',
      ResultMsg: 'Success',
      OrderId: `KBZ${Date.now()}`,
      TransStatus: 'SUCCESS',
      TotalFee: '100000',
      Currency: 'MMK',
      TimeEnd: new Date().toISOString(),
    },
  }),

  refund: jest.fn().mockResolvedValue({
    Response: {
      ResultCode: '0',
      ResultMsg: 'Success',
      RefundId: `REFUND${Date.now()}`,
      RefundFee: '100000',
    },
  }),
};

/**
 * WavePay API Mocks
 */
const wavePayMocks = {
  createPayment: jest.fn().mockResolvedValue({
    status: 'success',
    data: {
      transaction_id: `WAVE${Date.now()}`,
      payment_url: 'https://wavepay.com/pay/test123',
      amount: 100000,
      currency: 'MMK',
      expiry_time: new Date(Date.now() + 3600000).toISOString(),
    },
  }),

  verifyPayment: jest.fn().mockResolvedValue({
    status: 'success',
    data: {
      transaction_id: `WAVE${Date.now()}`,
      status: 'completed',
      amount: 100000,
      paid_at: new Date().toISOString(),
    },
  }),

  payout: jest.fn().mockResolvedValue({
    status: 'success',
    data: {
      payout_id: `POUT${Date.now()}`,
      recipient_phone: '+959123456789',
      amount: 100000,
      status: 'completed',
      completed_at: new Date().toISOString(),
    },
  }),
};

/**
 * AYAPay API Mocks
 */
const ayaPayMocks = {
  createPayment: jest.fn().mockResolvedValue({
    statusCode: '0000',
    statusMessage: 'Success',
    transactionId: `AYA${Date.now()}`,
    paymentToken: 'token_123',
    deepLink: 'ayapay://pay/test123',
    qrCode: 'qr_data_123',
  }),

  checkStatus: jest.fn().mockResolvedValue({
    statusCode: '0000',
    statusMessage: 'Success',
    transactionId: `AYA${Date.now()}`,
    transactionStatus: 'SUCCESS',
    amount: 100000,
    currency: 'MMK',
  }),

  merchantPayout: jest.fn().mockResolvedValue({
    statusCode: '0000',
    statusMessage: 'Success',
    payoutId: `AYA_PAYOUT${Date.now()}`,
    recipientAccount: '+959123456789',
    amount: 100000,
    status: 'SUCCESS',
  }),
};

/**
 * SendGrid API Mocks
 */
const sendGridMocks = {
  send: jest.fn().mockResolvedValue([{
    statusCode: 202,
    headers: {},
    body: {},
  }]),
};

/**
 * AWS S3 Mocks
 */
const s3Mocks = {
  upload: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Location: 'https://trm-test-bucket.s3.amazonaws.com/test-file.pdf',
      Key: 'test-file.pdf',
      Bucket: 'trm-test-bucket',
    }),
  }),

  getObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Body: Buffer.from('test file content'),
      ContentType: 'application/pdf',
    }),
  }),

  deleteObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),

  getSignedUrl: jest.fn().mockReturnValue('https://trm-test-bucket.s3.amazonaws.com/signed-url.pdf'),
};

/**
 * Redis Mocks
 */
const redisMocks = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(3600),
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(0),
  lpush: jest.fn().mockResolvedValue(1),
  rpop: jest.fn().mockResolvedValue(null),
  lrange: jest.fn().mockResolvedValue([]),
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn().mockResolvedValue(null),
  hgetall: jest.fn().mockResolvedValue({}),
  hdel: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  flushdb: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn().mockResolvedValue('OK'),
};

/**
 * Bull Queue Mocks
 */
const bullMocks = {
  add: jest.fn().mockResolvedValue({
    id: 'job_123',
    data: {},
    opts: {},
  }),

  getJob: jest.fn().mockResolvedValue({
    id: 'job_123',
    data: {},
    getState: jest.fn().mockResolvedValue('completed'),
    returnvalue: { success: true },
  }),

  removeJobs: jest.fn().mockResolvedValue(),

  clean: jest.fn().mockResolvedValue([]),

  getWaiting: jest.fn().mockResolvedValue([]),
  getActive: jest.fn().mockResolvedValue([]),
  getCompleted: jest.fn().mockResolvedValue([]),
  getFailed: jest.fn().mockResolvedValue([]),
};

/**
 * Setup all mocks
 */
const setupAllMocks = () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup axios mock defaults
    axios.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: {} });
    axios.get.mockResolvedValue({ data: {} });
    axios.put.mockResolvedValue({ data: {} });
    axios.delete.mockResolvedValue({ data: {} });
  });
};

module.exports = {
  viberMocks,
  telegramMocks,
  whatsappMocks,
  stripeMocks,
  kbzPayMocks,
  wavePayMocks,
  ayaPayMocks,
  sendGridMocks,
  s3Mocks,
  redisMocks,
  bullMocks,
  setupAllMocks,
};
