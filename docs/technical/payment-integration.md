# Payment Gateway Integration Documentation

## Overview

This document describes the comprehensive payment gateway integration for the Myanmar market, supporting KBZPay, WavePay, AYA Pay, and MMQR (Myanmar Quick Response) standard.

## Architecture

### Backend Components

1. **BasePaymentProvider** (`server/services/payment/providers/BasePaymentProvider.js`)
   - Abstract base class defining the contract for all payment providers
   - Implements common functionality: retry logic, signature generation, phone validation
   - Key methods:
     - `createDeposit()` - Initiate deposit/payment
     - `createWithdrawal()` - Process payouts
     - `checkStatus()` - Query transaction status
     - `cancel()` - Handle refunds
     - `generateQRCode()` - Create QR codes for in-person payments
     - `verifyWebhook()` - Validate webhook signatures

2. **Provider Implementations**
   - **KBZPayProvider** (`server/services/payment/providers/KBZPayProvider.js`)
     - Myanmar's largest mobile wallet
     - Supports QR payments, app deep links, and transfers
     - Uses MD5 signature with sorted parameters
   
   - **WavePayProvider** (`server/services/payment/providers/WavePayProvider.js`)
     - Popular mobile payment solution
     - SHA256 signature generation
     - Supports wallet-to-wallet transfers
   
   - **AYAPayProvider** (`server/services/payment/providers/AYAPayProvider.js`)
     - AYA Bank's payment service
     - HMAC-SHA256 signature
     - Banking-grade security

3. **MMQRService** (`server/services/payment/MMQRService.js`)
   - Implements Myanmar Quick Response standard
   - EMVCo-compliant QR code generation
   - Supports unified QR codes (works with multiple providers)
   - TLV (Tag-Length-Value) encoding
   - CRC16-CCITT checksum validation

4. **PaymentService** (`server/services/payment/PaymentService.js`)
   - Unified orchestrator for all payment operations
   - Provider management and initialization
   - Transaction lifecycle management
   - Webhook handling and reconciliation

### Data Models

1. **PaymentTransaction** (`server/models/PaymentTransaction.js`)
   ```javascript
   {
     transactionNumber: String,  // Unique identifier
     orderId: String,            // Provider order reference
     type: Enum['deposit', 'withdrawal', 'refund', ...],
     status: Enum['pending', 'completed', 'failed', ...],
     amount: Number,
     currency: String,
     provider: String,
     userId: ObjectId,
     recipientInfo: Object,
     qrCode: Object,
     providerRequests: Array,    // Audit trail
     retryAttempts: Array,
     refunds: Array
   }
   ```

2. **PaymentMethod** (`server/models/PaymentMethod.js`)
   ```javascript
   {
     userId: ObjectId,
     methodId: String,           // Unique identifier
     type: Enum['kbzpay', 'wavepay', 'ayapay', 'bank_transfer'],
     status: Enum['verified', 'pending', ...],
     mobileWallet: Object,       // Phone, account name
     bankAccount: Object,        // Bank details
     isDefault: Boolean,
     usageCount: Number
   }
   ```

### API Routes

**Base Path:** `/api/v1/payments`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/providers` | List available providers | Public |
| GET | `/providers/health` | Provider health status | Admin |
| POST | `/deposit` | Create deposit | User |
| POST | `/withdrawal` | Create withdrawal | User |
| GET | `/transactions` | List user transactions | User |
| GET | `/transactions/:id` | Get transaction details | User |
| GET | `/transactions/:id/status` | Check transaction status | User |
| GET | `/methods` | List payment methods | User |
| POST | `/methods` | Add payment method | User |
| PUT | `/methods/:id/default` | Set default method | User |
| DELETE | `/methods/:id` | Delete payment method | User |
| POST | `/qr-code` | Generate QR code | User |
| POST | `/webhooks/:provider` | Provider webhooks | Public |
| GET | `/admin/transactions` | All transactions | Admin |
| POST | `/admin/refund` | Process refund | Admin |
| POST | `/admin/reconcile` | Reconcile transactions | Admin |
| GET | `/admin/statistics` | Payment statistics | Admin |

### Frontend Components

1. **PaymentDashboard** (`src/sections/PaymentDashboard.tsx`)
   - Main payment management interface
   - Balance overview, quick actions, recent transactions
   - Tab navigation for different payment functions

2. **DepositForm** (`src/sections/DepositForm.tsx`)
   - Multi-step deposit process
   - Amount selection, provider selection, QR code display
   - Real-time validation and error handling

3. **WithdrawalForm** (`src/sections/WithdrawalForm.tsx`)
   - Withdrawal request flow
   - Payment method selection
   - Confirmation and processing status

4. **PaymentMethods** (`src/sections/PaymentMethods.tsx`)
   - Manage saved payment methods
   - Add new wallets/bank accounts
   - Set default methods

5. **TransactionHistory** (`src/sections/TransactionHistory.tsx`)
   - Complete transaction history
   - Filtering and search
   - Export to CSV
   - Transaction detail modal

## Configuration

### Environment Variables

```bash
# KBZPay
KBZPAY_ENABLED=true
KBZPAY_MERCHANT_ID=your_merchant_id
KBZPAY_MERCHANT_KEY=your_merchant_key
KBZPAY_APP_ID=your_app_id
KBZPAY_API_URL=https://api.kbzpay.com/payment/gateway
KBZPAY_ENVIRONMENT=sandbox|production

# WavePay
WAVEPAY_ENABLED=true
WAVEPAY_MERCHANT_ID=your_merchant_id
WAVEPAY_API_KEY=your_api_key
WAVEPAY_API_SECRET=your_api_secret
WAVEPAY_API_URL=https://api.wavemoney.io/v2
WAVEPAY_ENVIRONMENT=sandbox|production

# AYA Pay
AYAPAY_ENABLED=true
AYAPAY_MERCHANT_ID=your_merchant_id
AYAPAY_API_KEY=your_api_key
AYAPAY_API_SECRET=your_api_secret
AYAPAY_TERMINAL_ID=your_terminal_id
AYAPAY_API_URL=https://api.ayapay.com.mm/v1
AYAPAY_ENVIRONMENT=sandbox|production

# MMQR
MMQR_MERCHANT_ID=your_merchant_id
MMQR_MERCHANT_NAME=Your Company
MMQR_MERCHANT_CITY=Yangon
```

## Security Features

1. **Idempotency Keys**
   - Prevent duplicate transactions
   - 24-hour TTL with automatic cleanup
   - Stored in memory (Redis recommended for production)

2. **Webhook Verification**
   - Provider-specific signature validation
   - Timestamp validation (5-minute window)
   - Replay attack prevention

3. **Fraud Detection**
   - Rate limiting (10 requests per 15 minutes per user)
   - Daily volume limits (50 million MMK)
   - Rapid transaction detection
   - Suspicious pattern logging

4. **Data Sanitization**
   - Sensitive field redaction in logs
   - PII masking for phone numbers and account numbers
   - Secure audit trail storage

## Transaction Flow

### Deposit Flow

1. User initiates deposit via frontend
2. PaymentService validates request and checks idempotency
3. Transaction record created with 'pending' status
4. Provider API called to generate payment
5. QR code / payment URL returned to user
6. User completes payment via provider app
7. Provider sends webhook notification
8. Transaction status updated to 'completed'
9. User balance updated

### Withdrawal Flow

1. User initiates withdrawal via frontend
2. PaymentService validates balance and payment method
3. Transaction record created with 'pending' status
4. Provider API called to process payout
5. Transaction status updated to 'processing'
6. Provider processes transfer (async)
7. Webhook notification received on completion
8. Transaction status updated to 'completed'

### Reconciliation

- Automatic reconciliation runs every hour
- Checks pending transactions older than 5 minutes
- Queries provider for actual status
- Updates local records to match provider state
- Admin endpoint available for manual reconciliation

## Error Handling

### Retry Logic

- Maximum 3 retry attempts
- Exponential backoff (1s, 2s, 4s)
- Non-retryable errors:
  - INVALID_AMOUNT
  - INVALID_PHONE
  - INSUFFICIENT_BALANCE
  - ACCOUNT_BLOCKED
  - INVALID_CREDENTIALS

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| PROVIDER_ERROR | Provider service error | Retry |
| INVALID_SIGNATURE | Webhook verification failed | Reject |
| DUPLICATE_TRANSACTION | Idempotency key exists | Return existing |
| INSUFFICIENT_BALANCE | Not enough funds | Fail |
| INVALID_PHONE | Bad phone format | Fail |

## Testing

### Sandbox Testing

All providers support sandbox environments:

1. Set `*_ENVIRONMENT=sandbox` in .env
2. Use test credentials provided by each provider
3. Test transactions won't affect real balances

### Test Cases

```javascript
// Example test cases
describe('PaymentService', () => {
  it('should create deposit successfully', async () => {
    const result = await paymentService.createDeposit({
      userId: 'user123',
      amount: 10000,
      provider: 'kbzpay'
    });
    expect(result.success).toBe(true);
  });

  it('should handle duplicate idempotency key', async () => {
    const key = 'test-key-123';
    await paymentService.createDeposit({ ...depositData, idempotencyKey: key });
    const duplicate = await paymentService.createDeposit({ ...depositData, idempotencyKey: key });
    expect(duplicate.isDuplicate).toBe(true);
  });
});
```

## Monitoring

### Health Checks

```bash
# Check provider health
GET /api/v1/payments/providers/health

Response:
[
  {
    "provider": "kbzpay",
    "status": "healthy",
    "timestamp": "2026-02-05T10:00:00Z"
  }
]
```

### Metrics

Track these key metrics:
- Transaction volume by provider
- Success/failure rates
- Average processing time
- Reconciliation mismatches
- Webhook delivery rate

## Myanmar-Specific Considerations

1. **Phone Number Format**
   - Validate Myanmar format: `09xxxxxxxxx` or `+959xxxxxxxxx`
   - Normalize to international format for providers

2. **Currency**
   - Primary: MMK (Myanmar Kyat)
   - ISO numeric code: 104
   - No decimal places in transactions

3. **Bank Codes**
   - KBZ: Kanbawza Bank
   - AYA: AYA Bank
   - CB: CB Bank
   - YOMA: Yoma Bank
   - See `MYANMAR_BANKS` constant for complete list

4. **Regulatory Compliance**
   - Central Bank of Myanmar regulations
   - MPU (Myanmar Payment Union) standards
   - MMQR interoperability requirements

## Support

For issues or questions:
1. Check provider-specific error logs
2. Verify webhook signatures
3. Review transaction audit trail
4. Contact provider support with transaction ID

## Future Enhancements

- [ ] OneStop Pay integration
- [ ] MPU card support
- [ ] Multi-currency support (USD, THB)
- [ ] Recurring payments
- [ ] Split payments
- [ ] Escrow functionality
