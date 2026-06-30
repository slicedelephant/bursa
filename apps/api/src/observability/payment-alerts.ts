/**
 * Pure derivation of payment/webhook alerts from already-collected counters.
 * No I/O, no mutation. The owning service reads the existing Donation table and
 * the request-metrics store and passes plain numbers in here, so the alerting
 * logic stays deterministic and fully unit-testable.
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface PaymentAlert {
  readonly kind: string;
  readonly severity: AlertSeverity;
  readonly message: string;
  /** The numeric signal behind the alert (e.g. failure-rate percent or a count). */
  readonly value: number;
}

export interface PaymentAlertInput {
  /** Number of recent card donations considered (sample size). */
  readonly cardRecent: number;
  /** How many of those recent card donations failed. */
  readonly cardFailed: number;
  /** Pledges stuck in PLEDGED well past the expected capture window. */
  readonly stuckPledges: number;
  /** Webhook deliveries that were rejected/failed (4xx/5xx on the webhook route). */
  readonly webhookFailures: number;
}

export const CARD_WAVE_MIN_SAMPLE = 10;
export const CARD_WAVE_WARN_PCT = 30;
export const CARD_WAVE_CRIT_PCT = 50;
export const STUCK_PLEDGE_CRIT = 10;
export const WEBHOOK_FAIL_CRIT = 5;

function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

export function derivePaymentAlerts(
  input: PaymentAlertInput,
): readonly PaymentAlert[] {
  const alerts: PaymentAlert[] = [];

  if (input.cardRecent >= CARD_WAVE_MIN_SAMPLE) {
    const ratePct = round((input.cardFailed / input.cardRecent) * 100, 1);
    if (ratePct >= CARD_WAVE_WARN_PCT) {
      alerts.push({
        kind: 'card_decline_wave',
        severity: ratePct >= CARD_WAVE_CRIT_PCT ? 'critical' : 'warning',
        message: `Card failure rate ${ratePct}% over last ${input.cardRecent} donations`,
        value: ratePct,
      });
    }
  }

  if (input.stuckPledges > 0) {
    alerts.push({
      kind: 'stuck_pledges',
      severity:
        input.stuckPledges >= STUCK_PLEDGE_CRIT ? 'critical' : 'warning',
      message: `${input.stuckPledges} pledge(s) stuck awaiting capture`,
      value: input.stuckPledges,
    });
  }

  if (input.webhookFailures > 0) {
    alerts.push({
      kind: 'webhook_failure',
      severity:
        input.webhookFailures >= WEBHOOK_FAIL_CRIT ? 'critical' : 'warning',
      message: `${input.webhookFailures} webhook delivery failure(s)`,
      value: input.webhookFailures,
    });
  }

  return alerts;
}
