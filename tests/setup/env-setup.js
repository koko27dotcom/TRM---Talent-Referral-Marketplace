/**
 * Environment Setup for Tests
 * Configures test environment variables
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Database configuration
process.env.MONGODB_URI = 'mongodb://localhost:27017/trm_referral_test';
process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/trm_referral_test';

// JWT configuration
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-jwt-tokens';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-jwt-tokens';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// Encryption keys
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
process.env.ENCRYPTION_IV = 'test-iv-16-chars';

// API Keys (test values)
process.env.API_KEY_SALT = 'test-api-key-salt';
process.env.API_RATE_LIMIT = '1000';

// Payment providers (mock mode)
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_stripe_key';

// Myanmar Payment Providers
process.env.KBZPAY_MERCHANT_ID = 'test_kbzpay_merchant';
process.env.KBZPAY_API_KEY = 'test_kbzpay_api_key';
process.env.KBZPAY_SECRET_KEY = 'test_kbzpay_secret';

process.env.WAVEPAY_MERCHANT_ID = 'test_wavepay_merchant';
process.env.WAVEPAY_API_KEY = 'test_wavepay_api_key';
process.env.WAVEPAY_SECRET_KEY = 'test_wavepay_secret';

process.env.AYAPAY_MERCHANT_ID = 'test_ayapay_merchant';
process.env.AYAPAY_API_KEY = 'test_ayapay_api_key';
process.env.AYAPAY_SECRET_KEY = 'test_ayapay_secret';

// MMQR Configuration
process.env.MMQR_MERCHANT_ID = 'test_mmqr_merchant';
process.env.MMQR_MERCHANT_NAME = 'Test Merchant';
process.env.MMQR_MERCHANT_CITY = 'Yangon';

// Messaging providers (mock mode)
process.env.VIBER_AUTH_TOKEN = 'test_viber_token';
process.env.VIBER_WEBHOOK_URL = 'http://localhost:3001/webhooks/viber';

process.env.TELEGRAM_BOT_TOKEN = 'test_telegram_token';
process.env.TELEGRAM_WEBHOOK_URL = 'http://localhost:3001/webhooks/telegram';

process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_whatsapp_phone_id';
process.env.WHATSAPP_ACCESS_TOKEN = 'test_whatsapp_token';

// Email configuration (mock)
process.env.SENDGRID_API_KEY = 'SG.test_sendgrid_key';
process.env.EMAIL_FROM = 'test@trm-referral.com';
process.env.EMAIL_FROM_NAME = 'TRM Test';

// Redis configuration
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.REDIS_TEST_URL = 'redis://localhost:6379/1';

// AWS S3 (mock)
process.env.AWS_ACCESS_KEY_ID = 'test_aws_access_key';
process.env.AWS_SECRET_ACCESS_KEY = 'test_aws_secret_key';
process.env.AWS_S3_BUCKET = 'trm-test-bucket';
process.env.AWS_REGION = 'ap-southeast-1';

// Application settings
process.env.PORT = '3001';
process.env.API_URL = 'http://localhost:3001';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Feature flags
process.env.ENABLE_MESSAGING_MOCK = 'true';
process.env.ENABLE_PAYMENT_MOCK = 'true';
process.env.ENABLE_EMAIL_MOCK = 'true';
process.env.MESSAGING_MOCK_MODE = 'true';

// Security settings
process.env.BCRYPT_ROUNDS = '4'; // Lower for faster tests
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

// Logging
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
process.env.ENABLE_REQUEST_LOGGING = 'false';

// Test-specific settings
process.env.TEST_TIMEOUT = '30000';
process.env.TEST_DB_CLEANUP = 'true';
