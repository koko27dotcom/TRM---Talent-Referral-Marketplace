# Messaging Integration Guide

## Overview

This document describes the messaging integration for the TRM Referral Platform, focusing on **Viber** and **Telegram** as the primary communication channels for the Myanmar market (99% user penetration).

## Architecture

### Service Structure

```
server/
├── services/
│   ├── messagingService.js      # Unified messaging service
│   ├── whatsappService.js       # Legacy WhatsApp support
│   └── ...
├── routes/
│   ├── messaging.js             # Viber & Telegram routes
│   ├── whatsapp.js              # Legacy WhatsApp routes
│   └── ...
└── models/
    ├── User.js                  # Updated with messagingPreferences
    └── ...
```

## Supported Platforms

### 1. Viber (Primary)

**Why Viber?**
- 99% penetration in Myanmar
- Free messaging platform
- Rich messaging features
- Easy bot integration

**Configuration:**
```bash
VIBER_AUTH_TOKEN=your-viber-auth-token
VIBER_WEBHOOK_URL=https://your-api.com/api/messaging/viber/webhook
```

**Features:**
- Text messages
- Keyboard buttons (interactive)
- Broadcast messaging
- Webhook events (subscribed, unsubscribed, message)

### 2. Telegram (Primary)

**Why Telegram?**
- Growing popularity in Myanmar
- Secure messaging
- Rich bot API
- Channel broadcasting

**Configuration:**
```bash
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=https://your-api.com/api/messaging/telegram/webhook
```

**Features:**
- Text messages with HTML formatting
- Inline keyboards
- Callback queries
- Broadcast messaging
- Webhook management

### 3. WhatsApp (Legacy)

**Status:** Supported but not primary
**Use Case:** International users, corporate clients

## API Endpoints

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messaging/viber/webhook` | POST | Receive Viber events |
| `/api/messaging/telegram/webhook` | POST | Receive Telegram events |

### Messaging

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/messaging/send` | POST | Send message to user | Admin |
| `/api/messaging/viber/send` | POST | Send Viber message | Admin |
| `/api/messaging/telegram/send` | POST | Send Telegram message | Admin |
| `/api/messaging/broadcast` | POST | Broadcast to multiple users | Admin |

### User Preferences

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/messaging/connect` | POST | Connect messaging platform | User |
| `/api/messaging/disconnect` | DELETE | Disconnect platform | User |
| `/api/messaging/preferences` | GET | Get preferences | User |
| `/api/messaging/preferences` | PUT | Update preferences | User |

### Notifications

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/messaging/notify/referral-status` | POST | Send status update | User |
| `/api/messaging/notify/payout` | POST | Send payout notification | User |
| `/api/messaging/notify/job-alert` | POST | Send job alert | Admin |

## Bot Commands

### Viber Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Show help menu |
| `/academy` | Referral Academy link |
| `/status` | Check referral status |
| `/balance` | Check balance |
| `/jobs` | Browse jobs |

### Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Show help menu |
| `/academy` | Referral Academy info |
| `/status` | Check referral status |
| `/balance` | Check balance |
| `/jobs` | Browse jobs |
| `/contact` | Contact support |

## Setup Instructions

### 1. Viber Setup

1. Create Viber Public Account at [https://partners.viber.com](https://partners.viber.com)
2. Get Auth Token from account settings
3. Set webhook URL:
   ```bash
   POST /api/messaging/viber/setup-webhook
   {
     "url": "https://your-api.com/api/messaging/viber/webhook"
   }
   ```

### 2. Telegram Setup

1. Create bot with [@BotFather](https://t.me/botfather)
2. Get bot token
3. Set webhook URL:
   ```bash
   POST /api/messaging/telegram/setup-webhook
   {
     "url": "https://your-api.com/api/messaging/telegram/webhook"
   }
   ```

### 3. Environment Variables

```bash
# Viber
VIBER_AUTH_TOKEN=xxx
VIBER_WEBHOOK_URL=https://api.trm.referral/api/messaging/viber/webhook

# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_WEBHOOK_URL=https://api.trm.referral/api/messaging/telegram/webhook

# General
MESSAGING_MOCK_MODE=false
MESSAGING_DEFAULT_LANGUAGE=my
MESSAGING_RATE_LIMIT=30
```

## User Flow

### Connecting Messaging Platform

1. User registers on web platform
2. User opens Viber/Telegram and sends `/start`
3. Bot sends welcome message with instructions
4. User links account on web platform
5. User receives notifications via preferred platform

### Notification Types

- **Referral Status Updates**: When referral status changes
- **Payout Notifications**: When payout is processed
- **Job Alerts**: New matching jobs
- **Academy Updates**: New course content
- **System Notifications**: Important announcements

## Code Examples

### Send Message

```javascript
const messagingService = require('./services/messagingService.js');

// Send to user's preferred platform
await messagingService.sendMessage(userId, 'Hello!');

// Send to specific platform
await messagingService.sendViberMessage(userId, 'Hello from Viber!');
await messagingService.sendTelegramMessage(chatId, 'Hello from Telegram!');
```

### Send Notification

```javascript
// Referral status update
await messagingService.sendReferralStatusUpdate(
  userId,
  referral,
  'hired',
  'my'
);

// Payout notification
await messagingService.sendPayoutNotification(
  userId,
  payout,
  'paid',
  'my'
);
```

### Handle Webhook

```javascript
// Viber webhook handler
app.post('/api/messaging/viber/webhook', async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately
  
  const result = await messagingService.processViberWebhook(req.body);
  console.log('Processed:', result);
});
```

## Testing

### Mock Mode

Enable mock mode for development:
```bash
MESSAGING_MOCK_MODE=true
```

In mock mode, messages are logged to console instead of sent to APIs.

### Testing Commands

```bash
# Test Viber message
curl -X POST http://localhost:5000/api/messaging/viber/send \
  -H "Authorization: Bearer TOKEN" \
  -d '{"userId": "USER_ID", "message": "Test"}'

# Test Telegram message
curl -X POST http://localhost:5000/api/messaging/telegram/send \
  -H "Authorization: Bearer TOKEN" \
  -d '{"chatId": "CHAT_ID", "message": "Test"}'
```

## Rate Limiting

- **Viber**: 30 messages/minute
- **Telegram**: 30 messages/second
- **Broadcast**: Batched in groups of 10 with 1-second delays

## Security

1. **Webhook Verification**: Always verify webhook signatures
2. **User Opt-in**: Users must explicitly opt-in to messaging
3. **Rate Limiting**: Prevents spam and abuse
4. **Data Privacy**: Store only necessary user data

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check webhook URL is publicly accessible
   - Verify SSL certificate
   - Check firewall settings

2. **Messages not sending**
   - Verify auth tokens
   - Check rate limits
   - Review error logs

3. **User not receiving notifications**
   - Verify user opted in
   - Check platform connection
   - Review blocked users list

## Future Enhancements

- [ ] Rich media messages (images, documents)
- [ ] Voice messages
- [ ] Location sharing
- [ ] Payment integration within bots
- [ ] AI-powered chat responses
- [ ] Multi-language support improvements
