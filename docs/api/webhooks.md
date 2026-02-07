# TRM Webhooks

Webhooks allow your application to receive real-time notifications when events occur in TRM. Instead of polling for changes, we'll send HTTP POST requests to your endpoint with event data.

## Overview

- **Delivery Method**: HTTP POST
- **Content-Type**: `application/json`
- **Authentication**: HMAC-SHA256 signature in `X-TRM-Signature` header
- **Retry Policy**: Exponential backoff with up to 5 retries

## Setting Up Webhooks

### 1. Create a Webhook Endpoint

Your endpoint must:
- Accept POST requests
- Return a 2xx status code for successful delivery
- Respond within 30 seconds
- Be accessible from the internet (no localhost in production)

### 2. Register Your Webhook

Use the API or Developer Portal to register your webhook:

```bash
curl -X POST https://api.trm.com/v1/webhooks \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Webhook",
    "url": "https://myapp.com/webhooks/trm",
    "events": ["referral.created", "referral.hired"]
  }'
```

### 3. Verify Webhook Signatures

We sign each webhook request with your webhook secret. Verify signatures to ensure requests are from TRM:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret, timestamp) {
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  const provided = signature.replace('v1=', '');
  return crypto.timingSafeEqual(
    Buffer.from(provided, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

## Webhook Events

### Referral Events

#### `referral.created`
Triggered when a new referral is submitted.

```json
{
  "event": "referral.created",
  "data": {
    "referral_id": "ref_123",
    "job_id": "job_456",
    "company_id": "comp_789",
    "candidate_email": "candidate@example.com",
    "candidate_name": "John Doe",
    "status": "submitted",
    "referral_bonus": 1000,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### `referral.status_changed`
Triggered when a referral status changes.

```json
{
  "event": "referral.status_changed",
  "data": {
    "referral_id": "ref_123",
    "previous_status": "submitted",
    "new_status": "interview_scheduled",
    "changed_at": "2024-01-16T14:20:00Z"
  },
  "created_at": "2024-01-16T14:20:00Z"
}
```

#### `referral.hired`
Triggered when a referred candidate is hired.

```json
{
  "event": "referral.hired",
  "data": {
    "referral_id": "ref_123",
    "job_id": "job_456",
    "company_id": "comp_789",
    "candidate_email": "candidate@example.com",
    "referral_bonus": 1000,
    "payout_status": "pending",
    "hired_at": "2024-02-01T09:00:00Z"
  },
  "created_at": "2024-02-01T09:00:00Z"
}
```

#### `referral.rejected`
Triggered when a referral is rejected.

```json
{
  "event": "referral.rejected",
  "data": {
    "referral_id": "ref_123",
    "job_id": "job_456",
    "reason": "Not a fit for the role",
    "rejected_at": "2024-01-20T16:45:00Z"
  },
  "created_at": "2024-01-20T16:45:00Z"
}
```

### Job Events

#### `job.published`
Triggered when a new job is published.

```json
{
  "event": "job.published",
  "data": {
    "job_id": "job_456",
    "company_id": "comp_789",
    "title": "Senior Software Engineer",
    "location": {
      "city": "San Francisco",
      "country": "USA"
    },
    "referral_bonus": 1000,
    "published_at": "2024-01-15T08:00:00Z"
  },
  "created_at": "2024-01-15T08:00:00Z"
}
```

#### `job.closed`
Triggered when a job is closed.

```json
{
  "event": "job.closed",
  "data": {
    "job_id": "job_456",
    "company_id": "comp_789",
    "title": "Senior Software Engineer",
    "closed_at": "2024-03-01T17:00:00Z"
  },
  "created_at": "2024-03-01T17:00:00Z"
}
```

### Payout Events

#### `payout.completed`
Triggered when a referral bonus payout is completed.

```json
{
  "event": "payout.completed",
  "data": {
    "referral_id": "ref_123",
    "payout_id": "pay_789",
    "amount": 1000,
    "currency": "USD",
    "method": "bank_transfer",
    "completed_at": "2024-02-15T12:00:00Z"
  },
  "created_at": "2024-02-15T12:00:00Z"
}
```

### User Events

#### `user.verified`
Triggered when a user completes verification.

```json
{
  "event": "user.verified",
  "data": {
    "user_id": "user_123",
    "email": "user@example.com",
    "verified_at": "2024-01-10T11:30:00Z"
  },
  "created_at": "2024-01-10T11:30:00Z"
}
```

## Webhook Headers

Each webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `X-TRM-Event` | The event type (e.g., `referral.created`) |
| `X-TRM-Delivery` | Unique delivery ID for tracking |
| `X-TRM-Signature` | HMAC-SHA256 signature for verification |
| `X-TRM-Timestamp` | Unix timestamp of when the event was sent |
| `X-TRM-Attempt` | Delivery attempt number (1-5) |

## Retry Policy

If your endpoint doesn't return a 2xx status code, we'll retry with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |
| 4 | 4 seconds |
| 5 | 8 seconds |

After 5 failed attempts, the webhook will be marked as failed and you'll be notified.

## Best Practices

### 1. Respond Quickly
Return a 2xx response immediately before processing the event. Process the event asynchronously if needed.

### 2. Handle Duplicates
Use the `X-TRM-Delivery` header to deduplicate events. Each delivery has a unique ID.

### 3. Verify Signatures
Always verify webhook signatures to ensure requests are from TRM.

### 4. Use HTTPS
Always use HTTPS endpoints in production to ensure secure data transmission.

### 5. Test Your Endpoint
Use the test webhook feature in the Developer Portal to verify your endpoint works correctly.

## SDK Webhook Helpers

Our SDKs include webhook verification helpers:

### JavaScript
```javascript
const { TRM } = require('@trm/sdk');

// Verify webhook signature
const isValid = TRM.verifyWebhookSignature(payload, signature, secret, timestamp);
```

### Python
```python
from trm_sdk import WebhookHandler

handler = WebhookHandler(secret)
result = handler.handle(request)
```

### PHP
```php
use TRM\WebhookHandler;

$handler = new WebhookHandler($secret);
$isValid = $handler->verifySignature($payload, $signature, $timestamp);
```

## Troubleshooting

### Webhook Not Receiving Events
1. Check that your endpoint is publicly accessible
2. Verify the webhook URL is correct
3. Check that you've subscribed to the correct events
4. Review webhook delivery logs in the Developer Portal

### Signature Verification Failing
1. Ensure you're using the correct webhook secret
2. Check that you're constructing the signed payload correctly
3. Verify you're using HMAC-SHA256

### Events Being Retried
1. Ensure your endpoint returns a 2xx status code
2. Check that your endpoint responds within 30 seconds
3. Verify your endpoint can handle the request payload size
