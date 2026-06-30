import {
  MessagingChannel,
  MessagingProvider,
  OutboundMessage,
  SendResult,
} from './messaging-provider.interface';

/**
 * WhatsApp Business Cloud API provider — a compile-only SKELETON. It is selected
 * only when `MESSAGING_PROVIDER=whatsapp` and credentials are present, and is
 * NEVER exercised in tests (tests always use the MockMessagingProvider). The
 * real send is a lazy `fetch` against graph.facebook.com; no SDK, no top-level
 * network. Money is never on this path (E4 email thank-you is untouched).
 */
export interface WhatsAppConfig {
  readonly token: string;
  readonly phoneNumberId: string;
  readonly apiVersion?: string;
}

const SUPPORTED: ReadonlyArray<MessagingChannel> = ['WHATSAPP'];

export class WhatsAppMessagingProvider implements MessagingProvider {
  constructor(private readonly config: WhatsAppConfig) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    if (!SUPPORTED.includes(message.channel)) {
      return {
        ok: false,
        channel: message.channel,
        reason: 'unsupported_channel',
      };
    }

    const version = this.config.apiVersion ?? 'v19.0';
    const url = `https://graph.facebook.com/${version}/${this.config.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: message.to,
        type: 'text',
        text: { body: message.body },
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        channel: message.channel,
        reason: `http_${res.status}`,
      };
    }
    const data = (await res.json()) as { messages?: Array<{ id?: string }> };
    return {
      ok: true,
      channel: message.channel,
      ref: data.messages?.[0]?.id,
    };
  }
}
