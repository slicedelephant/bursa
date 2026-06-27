import { derivePaymentAlerts, PaymentAlertInput } from './payment-alerts';

const input = (over: Partial<PaymentAlertInput> = {}): PaymentAlertInput => ({
  cardRecent: 0,
  cardFailed: 0,
  stuckPledges: 0,
  webhookFailures: 0,
  ...over,
});

describe('derivePaymentAlerts', () => {
  it('returns no alerts on a healthy system', () => {
    expect(derivePaymentAlerts(input())).toEqual([]);
  });

  it('ignores card failures below the minimum sample size', () => {
    const alerts = derivePaymentAlerts(input({ cardRecent: 5, cardFailed: 5 }));
    expect(alerts.find((a) => a.kind === 'card_decline_wave')).toBeUndefined();
  });

  it('warns on an elevated card failure rate', () => {
    const alerts = derivePaymentAlerts(input({ cardRecent: 20, cardFailed: 7 }));
    const a = alerts.find((x) => x.kind === 'card_decline_wave');
    expect(a?.severity).toBe('warning');
    expect(a?.value).toBe(35);
  });

  it('escalates a severe card decline wave to critical', () => {
    const alerts = derivePaymentAlerts(input({ cardRecent: 20, cardFailed: 12 }));
    expect(alerts.find((x) => x.kind === 'card_decline_wave')?.severity).toBe(
      'critical',
    );
  });

  it('flags stuck pledges and escalates many of them', () => {
    expect(
      derivePaymentAlerts(input({ stuckPledges: 2 })).find(
        (a) => a.kind === 'stuck_pledges',
      )?.severity,
    ).toBe('warning');
    expect(
      derivePaymentAlerts(input({ stuckPledges: 12 })).find(
        (a) => a.kind === 'stuck_pledges',
      )?.severity,
    ).toBe('critical');
  });

  it('flags webhook delivery failures', () => {
    expect(
      derivePaymentAlerts(input({ webhookFailures: 1 })).find(
        (a) => a.kind === 'webhook_failure',
      )?.severity,
    ).toBe('warning');
    expect(
      derivePaymentAlerts(input({ webhookFailures: 6 })).find(
        (a) => a.kind === 'webhook_failure',
      )?.severity,
    ).toBe('critical');
  });

  it('can return multiple alerts at once', () => {
    const alerts = derivePaymentAlerts(
      input({ cardRecent: 10, cardFailed: 9, stuckPledges: 1, webhookFailures: 1 }),
    );
    expect(alerts.map((a) => a.kind).sort()).toEqual([
      'card_decline_wave',
      'stuck_pledges',
      'webhook_failure',
    ]);
  });
});
