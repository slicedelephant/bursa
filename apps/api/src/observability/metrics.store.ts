import { Injectable } from '@nestjs/common';
import { RequestSample } from './metrics-aggregate';

/**
 * In-memory bounded ring buffer of request samples. Per-instance (no Redis /
 * external infra), same justification as the E6 rate-limit store: enough to power
 * the operator dashboard on the prototype; horizontal scaling would swap this for
 * a shared store behind the same interface. Append is O(1); the oldest sample is
 * evicted once capacity is reached.
 */
@Injectable()
export class MetricsStore {
  private readonly capacity: number;
  private buffer: RequestSample[] = [];

  constructor(capacity = 1000) {
    this.capacity = Math.max(1, capacity);
  }

  /** Appends a sample, evicting the oldest when over capacity. Input is not mutated. */
  record(sample: RequestSample): void {
    const next =
      this.buffer.length >= this.capacity
        ? this.buffer.slice(1)
        : this.buffer.slice();
    next.push(sample);
    this.buffer = next;
  }

  /** Returns a defensive copy of all retained samples (newest last). */
  samples(): readonly RequestSample[] {
    return this.buffer.slice();
  }

  /** Returns samples with `timestamp >= from`. */
  since(from: number): readonly RequestSample[] {
    return this.buffer.filter((s) => s.timestamp >= from);
  }

  reset(): void {
    this.buffer = [];
  }
}
