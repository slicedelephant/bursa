/**
 * E17 Multi-Channel Impact-Feed — swappable messaging provider abstraction.
 *
 * Every outbound message to an external mobile channel (WhatsApp/Telegram/
 * Messenger/Push) goes through this interface, mirroring the E2 PaymentProvider
 * seam. The default binding is the deterministic, network-free
 * `MockMessagingProvider` (used in the prototype AND in every test). Real
 * WhatsApp/Telegram providers are compile-only skeletons selected via the
 * env-gated `createMessagingProvider` factory. This NEVER carries money: the
 * E4 email thank-you path is untouched; this only routes feed/voice updates.
 */

/** The external (non-in-app) channels E17 can deliver to. */
export type MessagingChannel = 'WHATSAPP' | 'TELEGRAM' | 'MESSENGER' | 'PUSH';

export interface OutboundMessage {
  readonly channel: MessagingChannel;
  /** Channel-specific recipient handle (phone, chat id, …). Mocked, never a secret. */
  readonly to: string;
  readonly subject?: string;
  readonly body: string;
}

export interface SendResult {
  readonly ok: boolean;
  readonly channel: MessagingChannel;
  readonly ref?: string;
  readonly reason?: string;
}

/** The abstraction every provider (mock + real skeletons) implements. */
export interface MessagingProvider {
  send(message: OutboundMessage): Promise<SendResult>;
}

/** DI token used to inject the configured provider (mock by default). */
export const MESSAGING_PROVIDER = Symbol('MESSAGING_PROVIDER');
