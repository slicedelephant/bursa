/**
 * E17 — pure smart-notification-timing scheduler. Decides whether a send is
 * allowed right now, honouring a minimum interval since the last send and an
 * optional quiet-hours window. Deterministic: `now` is INJECTED, there is no
 * `Date.now()` here, so time tests never flake. No I/O, returns new objects,
 * never mutates inputs. This is the "no spam" gate, not a cron worker — it is
 * evaluated on read / on trigger.
 */

export type QuietHours = readonly [startHour: number, endHour: number];

export interface TimingInput {
  /** Last time we sent to this donor on this channel, or null if never. */
  readonly lastSentAt: Date | string | null;
  /** Injected reference time (the "now" of the decision). */
  readonly now: Date | string;
  /** Minimum hours that must pass between two sends. */
  readonly minIntervalHours: number;
  /** Optional [start, end) local-hour window during which we never send. */
  readonly quietHours?: QuietHours;
}

export type TimingReason = 'OK' | 'TOO_SOON' | 'QUIET_HOURS';

export interface TimingDecision {
  readonly allowed: boolean;
  readonly reason: TimingReason;
}

const HOUR_MS = 60 * 60 * 1000;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** True when `hour` falls inside the [start, end) window, wrap-around aware. */
function inQuietHours(hour: number, [start, end]: QuietHours): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // Wrap-around window, e.g. 22..6 covers 22,23,0,1,…,5.
  return hour >= start || hour < end;
}

export function decideSendTiming(input: TimingInput): TimingDecision {
  const now = toDate(input.now);

  if (input.quietHours && inQuietHours(now.getHours(), input.quietHours)) {
    return { allowed: false, reason: 'QUIET_HOURS' };
  }

  if (input.lastSentAt !== null) {
    const elapsedHours =
      (now.getTime() - toDate(input.lastSentAt).getTime()) / HOUR_MS;
    if (elapsedHours < input.minIntervalHours) {
      return { allowed: false, reason: 'TOO_SOON' };
    }
  }

  return { allowed: true, reason: 'OK' };
}
