/**
 * Messaging Service Unit Tests
 * Tests for Viber, Telegram, and WhatsApp messaging
 */

const axios = require('axios');
const messagingService = require('../../../server/services/messagingService');
const { viberMocks, telegramMocks, whatsappMocks } = require('../../mocks/external-apis');

jest.mock('axios');

describe('Messaging Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MESSAGING_MOCK_MODE = 'false';
  });

  describe('Viber Messaging', () => {
    describe('sendViberMessage', () => {
      it('should send Viber message successfully', async () => {
        axios.post.mockResolvedValueOnce(viberMocks.sendMessage());

        const result = await messagingService.sendViberMessage('user123', 'Hello!');

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(axios.post).toHaveBeenCalledWith(
          'https://chatapi.viber.com/pa/send_message',
          expect.objectContaining({
            auth_token: expect.any(String),
            receiver: 'user123',
            type: 'text',
            text: 'Hello!',
          })
        );
      });

      it('should handle Viber API errors', async () => {
        axios.post.mockRejectedValueOnce({
          response: {
            data: { status_message: 'Invalid user' },
          },
        });

        await expect(messagingService.sendViberMessage('invalid_user', 'Hello!'))
          .rejects.toThrow('Invalid user');
      });

      it('should work in mock mode', async () => {
        process.env.MESSAGING_MOCK_MODE = 'true';

        const result = await messagingService.sendViberMessage('user123', 'Hello!');

        expect(result.success).toBe(true);
        expect(result.mock).toBe(true);
        expect(axios.post).not.toHaveBeenCalled();
      });
    });

    describe('sendViberKeyboard', () => {
      it('should send Viber keyboard message', async () => {
        axios.post.mockResolvedValueOnce(viberMocks.sendKeyboard());

        const buttons = [
          { text: 'Yes', action: 'yes' },
          { text: 'No', action: 'no' },
        ];

        const result = await messagingService.sendViberKeyboard('user123', 'Choose:', buttons);

        expect(result.success).toBe(true);
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            keyboard: expect.objectContaining({
              Type: 'keyboard',
              Buttons: expect.any(Array),
            }),
          })
        );
      });
    });

    describe('setViberWebhook', () => {
      it('should set Viber webhook', async () => {
        axios.post.mockResolvedValueOnce(viberMocks.setWebhook());

        const result = await messagingService.setViberWebhook('https://example.com/webhook');

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Telegram Messaging', () => {
    describe('sendTelegramMessage', () => {
      it('should send Telegram message successfully', async () => {
        axios.post.mockResolvedValueOnce(telegramMocks.sendMessage());

        const result = await messagingService.sendTelegramMessage('chat123', 'Hello!');

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('api.telegram.org'),
          expect.objectContaining({
            chat_id: 'chat123',
            text: 'Hello!',
          })
        );
      });

      it('should support message formatting options', async () => {
        axios.post.mockResolvedValueOnce(telegramMocks.sendMessage());

        await messagingService.sendTelegramMessage('chat123', 'Hello!', {
          parse_mode: 'HTML',
          disable_notification: true,
        });

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            parse_mode: 'HTML',
            disable_notification: true,
          })
        );
      });

      it('should handle Telegram API errors', async () => {
        axios.post.mockRejectedValueOnce(new Error('Network error'));

        await expect(messagingService.sendTelegramMessage('chat123', 'Hello!'))
          .rejects.toThrow();
      });
    });

    describe('sendTelegramPhoto', () => {
      it('should send photo with caption', async () => {
        axios.post.mockResolvedValueOnce(telegramMocks.sendPhoto());

        const result = await messagingService.sendTelegramPhoto(
          'chat123',
          'https://example.com/image.jpg',
          'Photo caption'
        );

        expect(result.success).toBe(true);
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('sendPhoto'),
          expect.objectContaining({
            chat_id: 'chat123',
            photo: 'https://example.com/image.jpg',
            caption: 'Photo caption',
          })
        );
      });
    });

    describe('sendTelegramInlineKeyboard', () => {
      it('should send message with inline keyboard', async () => {
        axios.post.mockResolvedValueOnce(telegramMocks.sendMessage());

        const keyboard = {
          inline_keyboard: [
            [{ text: 'Button 1', callback_data: 'btn1' }],
            [{ text: 'Button 2', callback_data: 'btn2' }],
          ],
        };

        await messagingService.sendTelegramInlineKeyboard('chat123', 'Choose:', keyboard);

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            reply_markup: keyboard,
          })
        );
      });
    });
  });

  describe('WhatsApp Messaging', () => {
    describe('sendWhatsAppMessage', () => {
      it('should send WhatsApp message', async () => {
        axios.post.mockResolvedValueOnce(whatsappMocks.sendMessage());

        const result = await messagingService.sendWhatsAppMessage('+959123456789', 'Hello!');

        expect(result.success).toBe(true);
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('graph.facebook.com'),
          expect.objectContaining({
            messaging_product: 'whatsapp',
            to: '+959123456789',
            type: 'text',
            text: { body: 'Hello!' },
          }),
          expect.any(Object)
        );
      });

      it('should send WhatsApp template message', async () => {
        axios.post.mockResolvedValueOnce(whatsappMocks.sendTemplate());

        const result = await messagingService.sendWhatsAppTemplate(
          '+959123456789',
          'welcome_message',
          [{ type: 'text', text: 'John' }]
        );

        expect(result.success).toBe(true);
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'template',
            template: expect.objectContaining({
              name: 'welcome_message',
            }),
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('Unified Messaging Interface', () => {
    describe('sendMessage', () => {
      it('should send message via Viber', async () => {
        axios.post.mockResolvedValueOnce(viberMocks.sendMessage());

        const result = await messagingService.sendMessage({
          platform: 'viber',
          userId: 'user123',
          message: 'Hello!',
        });

        expect(result.success).toBe(true);
      });

      it('should send message via Telegram', async () => {
        axios.post.mockResolvedValueOnce(telegramMocks.sendMessage());

        const result = await messagingService.sendMessage({
          platform: 'telegram',
          userId: 'chat123',
          message: 'Hello!',
        });

        expect(result.success).toBe(true);
      });

      it('should send message via WhatsApp', async () => {
        axios.post.mockResolvedValueOnce(whatsappMocks.sendMessage());

        const result = await messagingService.sendMessage({
          platform: 'whatsapp',
          userId: '+959123456789',
          message: 'Hello!',
        });

        expect(result.success).toBe(true);
      });

      it('should throw error for unsupported platform', async () => {
        await expect(messagingService.sendMessage({
          platform: 'unsupported',
          userId: 'user123',
          message: 'Hello!',
        })).rejects.toThrow('Unsupported messaging platform');
      });
    });

    describe('broadcastMessage', () => {
      it('should send message to multiple recipients', async () => {
        axios.post
          .mockResolvedValueOnce(viberMocks.sendMessage())
          .mockResolvedValueOnce(telegramMocks.sendMessage())
          .mockResolvedValueOnce(whatsappMocks.sendMessage());

        const recipients = [
          { platform: 'viber', userId: 'viber1' },
          { platform: 'telegram', userId: 'tg1' },
          { platform: 'whatsapp', userId: '+959123456789' },
        ];

        const results = await messagingService.broadcastMessage(recipients, 'Broadcast message');

        expect(results).toHaveLength(3);
        expect(results.every(r => r.success)).toBe(true);
      });

      it('should handle partial failures in broadcast', async () => {
        axios.post
          .mockResolvedValueOnce(viberMocks.sendMessage())
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValueOnce(whatsappMocks.sendMessage());

        const recipients = [
          { platform: 'viber', userId: 'viber1' },
          { platform: 'telegram', userId: 'tg1' },
          { platform: 'whatsapp', userId: '+959123456789' },
        ];

        const results = await messagingService.broadcastMessage(recipients, 'Broadcast message');

        expect(results).toHaveLength(3);
        expect(results.filter(r => r.success)).toHaveLength(2);
        expect(results.filter(r => !r.success)).toHaveLength(1);
      });
    });
  });

  describe('Webhook Handling', () => {
    describe('handleViberWebhook', () => {
      it('should handle incoming Viber message', async () => {
        const webhookData = {
          event: 'message',
          message: {
            type: 'text',
            text: 'Hello bot',
          },
          sender: {
            id: 'user123',
            name: 'Test User',
          },
        };

        const result = await messagingService.handleViberWebhook(webhookData);

        expect(result).toBeDefined();
      });

      it('should handle Viber subscription event', async () => {
        const webhookData = {
          event: 'subscribed',
          user: {
            id: 'user123',
            name: 'Test User',
          },
        };

        const result = await messagingService.handleViberWebhook(webhookData);

        expect(result.handled).toBe(true);
      });
    });

    describe('handleTelegramWebhook', () => {
      it('should handle incoming Telegram message', async () => {
        const webhookData = {
          message: {
            message_id: 1,
            from: { id: 123, first_name: 'Test' },
            chat: { id: 456, type: 'private' },
            date: Date.now(),
            text: '/start',
          },
        };

        const result = await messagingService.handleTelegramWebhook(webhookData);

        expect(result).toBeDefined();
      });

      it('should handle Telegram callback query', async () => {
        const webhookData = {
          callback_query: {
            id: 'query123',
            from: { id: 123, first_name: 'Test' },
            message: { message_id: 1, chat: { id: 456 } },
            data: 'button_clicked',
          },
        };

        const result = await messagingService.handleTelegramWebhook(webhookData);

        expect(result.handled).toBe(true);
      });
    });
  });
});
