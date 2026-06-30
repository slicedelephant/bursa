import { MessagingProvider } from './messaging-provider.interface';
import { MockMessagingProvider } from './mock-messaging.provider';
import { TelegramMessagingProvider } from './telegram-messaging.provider';
import { WhatsAppMessagingProvider } from './whatsapp-messaging.provider';

/**
 * Pure factory that picks the messaging provider from environment config,
 * mirroring the E2 PaymentProvider factory. Default is the network-free
 * MockMessagingProvider; the real WhatsApp/Telegram skeletons are only chosen
 * when explicitly selected AND their credentials are present — otherwise it
 * falls back to the mock so the app always boots without keys. No I/O here:
 * constructing a provider never opens a connection (sends are lazy).
 */
export type MessagingProviderKind = 'mock' | 'whatsapp' | 'telegram';

export interface MessagingEnv {
  readonly MESSAGING_PROVIDER?: string;
  readonly WHATSAPP_TOKEN?: string;
  readonly WHATSAPP_PHONE_ID?: string;
  readonly WHATSAPP_API_VERSION?: string;
  readonly TELEGRAM_BOT_TOKEN?: string;
}

export interface ProviderSelection {
  readonly kind: MessagingProviderKind;
  readonly provider: MessagingProvider;
  /** True when a real provider was requested but credentials forced a mock fallback. */
  readonly fellBack: boolean;
}

function normalizeKind(value?: string): MessagingProviderKind {
  const v = (value ?? 'mock').trim().toLowerCase();
  if (v === 'whatsapp' || v === 'telegram') return v;
  return 'mock';
}

export function selectMessagingProvider(env: MessagingEnv): ProviderSelection {
  const requested = normalizeKind(env.MESSAGING_PROVIDER);

  if (requested === 'whatsapp') {
    if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID) {
      return {
        kind: 'whatsapp',
        provider: new WhatsAppMessagingProvider({
          token: env.WHATSAPP_TOKEN,
          phoneNumberId: env.WHATSAPP_PHONE_ID,
          apiVersion: env.WHATSAPP_API_VERSION,
        }),
        fellBack: false,
      };
    }
    return {
      kind: 'mock',
      provider: new MockMessagingProvider(),
      fellBack: true,
    };
  }

  if (requested === 'telegram') {
    if (env.TELEGRAM_BOT_TOKEN) {
      return {
        kind: 'telegram',
        provider: new TelegramMessagingProvider({
          botToken: env.TELEGRAM_BOT_TOKEN,
        }),
        fellBack: false,
      };
    }
    return {
      kind: 'mock',
      provider: new MockMessagingProvider(),
      fellBack: true,
    };
  }

  return {
    kind: 'mock',
    provider: new MockMessagingProvider(),
    fellBack: false,
  };
}

/** Convenience used by the Nest module's `useFactory`. */
export function createMessagingProvider(env: MessagingEnv): MessagingProvider {
  return selectMessagingProvider(env).provider;
}
