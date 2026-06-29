import {
  decideModeration,
  evaluateCampaign,
  ModerationStatusValue,
} from './moderation-rules';

describe('moderation-rules', () => {
  describe('evaluateCampaign', () => {
    it('does not flag a clean campaign', () => {
      const result = evaluateCampaign({
        title: 'Fund my MBA at ESMT Berlin',
        story: 'I was admitted and need help with tuition.',
        country: 'DE',
      });
      expect(result.autoFlagged).toBe(false);
      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe('LOW');
    });

    it('flags suspicious keywords', () => {
      const result = evaluateCampaign({
        title: 'Guaranteed return investment opportunity',
        story: 'Send via western union and double your money.',
        country: 'DE',
      });
      expect(result.autoFlagged).toBe(true);
      expect(result.reasons.some((r) => r.startsWith('suspicious_keyword'))).toBe(
        true,
      );
    });

    it('flags a sanctioned country strongly', () => {
      const result = evaluateCampaign({
        title: 'Tuition help',
        story: 'Honest request.',
        country: 'KP',
      });
      expect(result.autoFlagged).toBe(true);
      expect(result.reasons.some((r) => r.startsWith('sanctioned_country'))).toBe(
        true,
      );
    });

    it('flags near-duplicate campaigns', () => {
      const result = evaluateCampaign({
        title: 'Help fund engineering scholarship tuition',
        story: 'Admitted student needs tuition support now',
        country: 'DE',
        others: [
          {
            title: 'Help fund engineering scholarship tuition',
            story: 'Admitted student needs tuition support now',
          },
        ],
      });
      expect(result.reasons.some((r) => r.startsWith('duplicate_campaign'))).toBe(
        true,
      );
    });

    it('accumulates community-flag pressure', () => {
      const result = evaluateCampaign({
        title: 'Tuition help',
        story: 'Honest request.',
        country: 'DE',
        openFlagCount: 5,
      });
      expect(result.reasons).toContain('community_flags:5');
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
    });
  });

  describe('decideModeration', () => {
    it('approves an open case', () => {
      expect(decideModeration('OPEN', 'APPROVE')).toEqual({
        status: 'APPROVED',
        freezeCampaign: false,
      });
    });

    it('rejects and signals a freeze', () => {
      expect(decideModeration('OPEN', 'REJECT')).toEqual({
        status: 'REJECTED',
        freezeCampaign: true,
      });
    });

    it('escalates an open case', () => {
      expect(decideModeration('OPEN', 'ESCALATE')).toEqual({
        status: 'ESCALATED',
        freezeCampaign: false,
      });
    });

    it('throws on a non-open case', () => {
      const states: ModerationStatusValue[] = [
        'APPROVED',
        'REJECTED',
        'ESCALATED',
      ];
      for (const state of states) {
        expect(() => decideModeration(state, 'APPROVE')).toThrow(
          'INVALID_TRANSITION',
        );
      }
    });
  });
});
