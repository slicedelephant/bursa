import { TrustDashboardData } from '../../../core/models';
import {
  backlogSummary,
  moderationStatusClass,
  moderationStatusLabel,
  reasonLabel,
  reasonLabels,
} from './moderation-format';

describe('moderation-format', () => {
  it('labels each moderation status', () => {
    expect(moderationStatusLabel('OPEN')).toBe('Open');
    expect(moderationStatusLabel('APPROVED')).toBe('Approved');
    expect(moderationStatusLabel('REJECTED')).toBe('Rejected');
    expect(moderationStatusLabel('ESCALATED')).toBe('Escalated');
  });

  it('classes each moderation status', () => {
    expect(moderationStatusClass('APPROVED')).toContain('brand-green');
    expect(moderationStatusClass('REJECTED')).toContain('brand-orange');
    expect(moderationStatusClass('ESCALATED')).toContain('amber');
    expect(moderationStatusClass('OPEN')).toContain('mist');
  });

  it('humanises reason codes with and without detail', () => {
    expect(reasonLabel('suspicious_keyword:bitcoin')).toBe(
      'Suspicious Keyword: bitcoin',
    );
    expect(reasonLabel('duplicate_campaign')).toBe('Duplicate Campaign');
  });

  it('maps a list of reasons', () => {
    expect(reasonLabels(['community_flags:2'])).toEqual(['Community Flags: 2']);
  });

  it('summarises the backlog', () => {
    const d = {
      moderation: { backlog: 3, openCases: 2, escalated: 1, byLevel: [] },
    } as unknown as TrustDashboardData;
    expect(backlogSummary(d)).toBe('2 open · 1 escalated');
  });
});
