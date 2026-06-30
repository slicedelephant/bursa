import { SloReport } from '../../../core/models';
import { alertClass, alertLabel, burnClass, objectiveLabel, windowRows } from './slo-format';

const report = (alert: SloReport['alert']): SloReport => ({
  objectivePct: 99.9,
  errorBudgetPct: 0.1,
  windows: [
    { windowLabel: 'fast', sliPct: 99.95, burnRate: 0.5, budgetConsumedPct: 50 },
    { windowLabel: 'slow_short', sliPct: 90, burnRate: 18, budgetConsumedPct: 100 },
  ],
  alert,
});

describe('slo-format', () => {
  it('classifies burn rate by threshold', () => {
    expect(burnClass(0.5)).toContain('green');
    expect(burnClass(7)).toContain('amber');
    expect(burnClass(20)).toContain('orange');
  });

  it('maps windows to friendly rows with a burn class', () => {
    const rows = windowRows(report('none'));
    expect(rows[0].label).toBe('Fast (1h)');
    expect(rows[1].label).toBe('Slow short (30m)');
    expect(rows[1].burnClass).toContain('orange');
  });

  it('labels and styles the alert state', () => {
    expect(alertLabel(report('page'))).toContain('PAGE');
    expect(alertClass(report('page'))).toContain('orange');
    expect(alertLabel(report('ticket'))).toContain('Ticket');
    expect(alertClass(report('ticket'))).toContain('amber');
    expect(alertLabel(report('none'))).toContain('Healthy');
    expect(alertClass(report('none'))).toContain('green');
  });

  it('summarises the objective and budget', () => {
    expect(objectiveLabel(report('none'))).toBe('Objective 99.9% · error budget 0.1%');
  });
});
