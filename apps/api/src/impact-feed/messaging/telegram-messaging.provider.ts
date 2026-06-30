import {
  MessagingChannel,
  MessagingProvider,
  OutboundMessage,
  SendResult,
} from './messaging-provider.interface';

/**
 * Telegram Bot API provider — a compile-only SKELETON. Selected only when
 * `MESSAGING_PROVIDER=telegram` and a bot token is present, and NEVER exercised
 * in tests (tests always use the MockMessagingProvider). The real send is a lazy
 * `fetch` against api.telegram.org; no SDK, no top-level network. Money is never
 * on this path (the E4 email thank-you stays as is).
 */
export interface TelegramConfig {
  readonly botToken: string;
}

const SUPPORTED: ReadonlyArray<MessagingChannel> = ['TELEGRAM'];

export class TelegramMessagingProvider implements MessagingProvider {
  constructor(private readonly config: TelegramConfig) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    if (!SUPPORTED.includes(message.channel)) {
      return {
        ok: false,
        channel: message.channel,
        reason: 'unsupported_channel',
      };
    }

    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
    const text = message.subject
      ? `${message.subject}\n\n${message.body}`
      : message.body;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: message.to, text }),
    });

    if (!res.ok) {
      return {
        ok: false,
        channel: message.channel,
        reason: `http_${res.status}`,
      };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
    };
    return {
      ok: data.ok === true,
      channel: message.channel,
      ref: data.result?.message_id?.toString(),
    };
  }
}
