# TRM API Authentication

The TRM API uses API keys for authentication. All API requests must include a valid API key in the request headers.

## API Keys

### Obtaining an API Key

1. Log in to your TRM account
2. Navigate to the Developer Portal
3. Go to the "API Keys" section
4. Click "Generate New Key"
5. Give your key a name and select permissions
6. Copy the key immediately (it won't be shown again)

### Using API Keys

Include your API key in the `X-API-Key` header of all requests:

```bash
curl -H "X-API-Key: trm_live_abc123..." \
  https://api.trm.com/v1/jobs
```

Or using the `Authorization` header with Bearer token:

```bash
curl -H "Authorization: Bearer trm_live_abc123..." \
  https://api.trm.com/v1/jobs
```

## API Key Format

API keys follow this format:

- **Production keys**: `trm_live_` prefix
- **Development keys**: `trm_test_` prefix

Example:
```
trm_live_a1b2c3d4e5f6789012345678901234567890abcdef
```

## Permissions

API keys can have the following permissions:

| Permission | Description |
|------------|-------------|
| `jobs:read` | Read job listings and details |
| `jobs:write` | Create, update, and delete jobs |
| `referrals:read` | Read referral data and status |
| `referrals:write` | Create and manage referrals |
| `companies:read` | Read company information |
| `companies:write` | Update company profiles |
| `users:read` | Read user profiles |
| `users:write` | Update user profiles |
| `webhooks:read` | Read webhook configurations |
| `webhooks:write` | Manage webhooks |
| `admin:full` | Full administrative access |

## Security Best Practices

### 1. Keep Keys Secret

Never expose API keys in:
- Client-side code (JavaScript, mobile apps)
- Public repositories
- Browser developer tools
- Logs or error messages

### 2. Use Environment Variables

Store API keys in environment variables:

```bash
# .env file
TRM_API_KEY=trm_live_abc123...
```

```javascript
// JavaScript
const trm = new TRM(process.env.TRM_API_KEY);
```

```python
# Python
import os
from trm_sdk import TRMClient

trm = TRMClient(os.environ['TRM_API_KEY'])
```

### 3. Use Minimum Permissions

Only grant the permissions your application needs. For example, if you only need to read jobs, don't grant write permissions.

### 4. Rotate Keys Regularly

Rotate your API keys periodically:
1. Generate a new key
2. Update your application to use the new key
3. Revoke the old key

### 5. Use IP Whitelisting

For additional security, configure IP whitelisting on your API keys. Only requests from whitelisted IPs will be accepted.

### 6. Monitor Usage

Regularly review your API key usage in the Developer Portal. Look for:
- Unexpected usage patterns
- Requests from unknown IPs
- Failed authentication attempts

## Rate Limiting

API requests are rate limited based on your plan. Rate limit headers are included in all responses:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

### Rate Limits by Plan

| Plan | Per Minute | Per Hour | Per Day |
|------|------------|----------|---------|
| Free | 60 | 1,000 | 10,000 |
| Pro | 120 | 5,000 | 50,000 |
| Enterprise | Custom | Custom | Custom |

### Handling Rate Limits

If you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Limit: 60 requests per minute.",
    "type": "rate_limit_error",
    "retry_after": 60
  }
}
```

Implement exponential backoff in your application:

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

## Error Responses

### Authentication Errors

#### Invalid API Key
```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid or has been revoked.",
    "type": "authentication_error"
  }
}
```

#### Missing API Key
```json
{
  "error": {
    "code": "unauthorized",
    "message": "API key is required. Include it in the X-API-Key header.",
    "type": "authentication_error"
  }
}
```

#### Insufficient Permissions
```json
{
  "error": {
    "code": "insufficient_permissions",
    "message": "This API key does not have the required permissions: jobs:write",
    "type": "authorization_error",
    "required_permissions": ["jobs:write"]
  }
}
```

#### IP Not Allowed
```json
{
  "error": {
    "code": "ip_not_allowed",
    "message": "Access denied from this IP address.",
    "type": "authorization_error"
  }
}
```

## Testing Authentication

Verify your API key is working:

```bash
curl -X POST https://api.trm.com/v1/auth/verify \
  -H "X-API-Key: your_api_key"
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "key": {
      "id": "key_123",
      "name": "Production Key",
      "permissions": ["jobs:read", "referrals:read"],
      "environment": "production"
    }
  }
}
```

## Revoking API Keys

If you suspect an API key has been compromised:

1. Revoke the key immediately in the Developer Portal
2. Generate a new key
3. Update your application with the new key

Revoked keys will return:
```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid, revoked, or has expired.",
    "type": "authentication_error"
  }
}
```

## Support

If you're having trouble with authentication:

- Check that your API key is correct and not expired
- Verify you have the required permissions
- Check your IP whitelist settings
- Contact api-support@trm.com for assistance
