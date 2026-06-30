import { Injectable } from '@nestjs/common';
import {
  MessagingProvider,
  OutboundMessage,
  SendResult,
} from './messaging-provider.interface';

/**
 * Deterministic, network-free messaging provider. Used in the prototype and in
 * ALL tests. Every send is recorded in an in-memory log (observable via `count`
 * / `recent`) and always succeeds with a stable, derived `ref` — no flakiness,
 * no external call. The real WhatsApp/Telegram providers are separate skeletons.
 */
@Injectable()
export class MockMessagingProvider implements MessagingProvider {
  private readonly sentLog: OutboundMessage[] = [];

  async send(message: OutboundMessage): Promise<SendResult> {
    this.sentLog.push(message);
    return {
      ok: true,
      channel: message.channel,
      ref: `mock_${message.channel.toLowerCase()}_${this.sentLog.length}`,
    };
  }

  get count(): number {
    return this.sentLog.length;
  }

  recent(n = 10): OutboundMessage[] {
    return this.sentLog.slice(-n);
  }
}
