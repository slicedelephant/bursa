import { MockMessagingProvider } from './mock-messaging.provider';
import {
  createMessagingProvider,
  selectMessagingProvider,
} from './messaging-provider.factory';
import { TelegramMessagingProvider } from './telegram-messaging.provider';
import { WhatsAppMessagingProvider } from './whatsapp-messaging.provider';

describe('selectMessagingProvider', () => {
  it('defaults to the mock provider when nothing is configured', () => {
    const sel = selectMessagingProvider({});
    expect(sel.kind).toBe('mock');
    expect(sel.provider).toBeInstanceOf(MockMessagingProvider);
    expect(sel.fellBack).toBe(false);
  });

  it('defaults to mock for an unknown provider value', () => {
    const sel = selectMessagingProvider({
      MESSAGING_PROVIDER: 'carrier-pigeon',
    });
    expect(sel.kind).toBe('mock');
    expect(sel.provider).toBeInstanceOf(MockMessagingProvider);
  });

  it('selects WhatsApp when requested with full credentials', () => {
    const sel = selectMessagingProvider({
      MESSAGING_PROVIDER: 'whatsapp',
      WHATSAPP_TOKEN: 't',
      WHATSAPP_PHONE_ID: 'p',
    });
    expect(sel.kind).toBe('whatsapp');
    expect(sel.provider).toBeInstanceOf(WhatsAppMessagingProvider);
    expect(sel.fellBack).toBe(false);
  });

  it('falls back to mock when WhatsApp is requested without credentials', () => {
    const sel = selectMessagingProvider({ MESSAGING_PROVIDER: 'WhatsApp' });
    expect(sel.kind).toBe('mock');
    expect(sel.provider).toBeInstanceOf(MockMessagingProvider);
    expect(sel.fellBack).toBe(true);
  });

  it('selects Telegram when requested with a bot token', () => {
    const sel = selectMessagingProvider({
      MESSAGING_PROVIDER: 'telegram',
      TELEGRAM_BOT_TOKEN: 'bot',
    });
    expect(sel.kind).toBe('telegram');
    expect(sel.provider).toBeInstanceOf(TelegramMessagingProvider);
    expect(sel.fellBack).toBe(false);
  });

  it('falls back to mock when Telegram is requested without a token', () => {
    const sel = selectMessagingProvider({ MESSAGING_PROVIDER: 'telegram' });
    expect(sel.kind).toBe('mock');
    expect(sel.fellBack).toBe(true);
  });

  it('createMessagingProvider returns just the provider instance', () => {
    expect(createMessagingProvider({})).toBeInstanceOf(MockMessagingProvider);
  });
});
