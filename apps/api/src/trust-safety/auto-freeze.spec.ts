import { decideCampaignFreeze, decideDonorFreeze } from './auto-freeze';

describe('auto-freeze', () => {
  describe('decideCampaignFreeze', () => {
    it('does not freeze below 3 chargebacks', () => {
      expect(decideCampaignFreeze(0).freeze).toBe(false);
      expect(decideCampaignFreeze(2).freeze).toBe(false);
    });

    it('freezes at 3 or more chargebacks with a reason', () => {
      const decision = decideCampaignFreeze(3);
      expect(decision.freeze).toBe(true);
      expect(decision.reason).toContain('chargeback_threshold:3');
    });
  });

  describe('decideDonorFreeze', () => {
    it('freezes on 2+ failed transactions plus a chargeback', () => {
      const decision = decideDonorFreeze({
        failedCount: 2,
        chargebackCount: 1,
      });
      expect(decision.freeze).toBe(true);
      expect(decision.reason).toContain('failed_chargeback_pattern');
    });

    it('does not freeze with failures but no chargeback', () => {
      expect(
        decideDonorFreeze({ failedCount: 5, chargebackCount: 0 }).freeze,
      ).toBe(false);
    });

    it('does not freeze with a chargeback but too few failures', () => {
      expect(
        decideDonorFreeze({ failedCount: 1, chargebackCount: 3 }).freeze,
      ).toBe(false);
    });
  });
});
