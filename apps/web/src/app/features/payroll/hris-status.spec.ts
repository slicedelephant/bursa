import { canSync, providerLabel, statusHeadline, statusTone } from './hris-status';

describe('providerLabel', () => {
  it('maps known providers', () => {
    expect(providerLabel('ADP')).toBe('ADP Workforce Now');
    expect(providerLabel('WORKDAY')).toBe('Workday');
  });
});

describe('statusTone', () => {
  it('maps statuses to tones', () => {
    expect(statusTone('SYNCED')).toBe('green');
    expect(statusTone('CONNECTED')).toBe('blue');
    expect(statusTone('ERROR')).toBe('orange');
    expect(statusTone('PENDING')).toBe('slate');
  });
});

describe('canSync', () => {
  it('is true only for CONNECTED/SYNCED', () => {
    expect(canSync('CONNECTED')).toBe(true);
    expect(canSync('SYNCED')).toBe(true);
    expect(canSync('PENDING')).toBe(false);
    expect(canSync('REVOKED')).toBe(false);
  });
});

describe('statusHeadline', () => {
  it('describes each state', () => {
    expect(statusHeadline('ADP', 'SYNCED')).toContain('connected and synced');
    expect(statusHeadline('ADP', 'CONNECTED')).toContain('run a sync');
    expect(statusHeadline('ADP', 'ERROR')).toContain('error');
    expect(statusHeadline('ADP', 'REVOKED')).toContain('revoked');
    expect(statusHeadline('ADP', 'PENDING')).toContain('pending');
  });
});
