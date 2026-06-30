import {
  formatDiscrepancy,
  formatEur,
  formatStaleAlert,
  needsAttention,
  reconStatusClass,
  reconStatusLabel,
  summaryTiles,
  tileToneClass,
} from './reconciliation-format';

describe('reconciliation-format', () => {
  describe('formatEur', () => {
    it('formats cents as whole euros', () => {
      expect(formatEur(40000)).toContain('400');
    });
  });

  describe('reconStatusLabel / reconStatusClass', () => {
    it('labels each status', () => {
      expect(reconStatusLabel('MATCHED')).toBe('Matched');
      expect(reconStatusLabel('DISCREPANCY')).toBe('Discrepancy');
      expect(reconStatusLabel('UNMATCHED')).toBe('Unmatched');
      expect(reconStatusLabel('PENDING')).toBe('Pending');
    });

    it('colours each status distinctly', () => {
      expect(reconStatusClass('MATCHED')).toContain('brand-green');
      expect(reconStatusClass('PENDING')).toContain('amber');
      expect(reconStatusClass('DISCREPANCY')).toContain('brand-orange');
      expect(reconStatusClass('UNMATCHED')).toContain('rose');
    });
  });

  describe('summaryTiles / tileToneClass', () => {
    const summary = {
      matchedCount: 3,
      pendingCount: 1,
      unmatchedCount: 2,
      discrepancyCount: 0,
      bankTxCount: 4,
    };

    it('builds four tiles with tones', () => {
      const tiles = summaryTiles(summary);
      expect(tiles).toHaveLength(4);
      expect(tiles[0]).toEqual({ label: 'Matched', value: '3', tone: 'good' });
      expect(tiles[2].tone).toBe('bad'); // unmatched > 0
      expect(tiles[3].tone).toBe('neutral'); // discrepancies == 0
    });

    it('maps tones to colour classes', () => {
      expect(tileToneClass('good')).toContain('brand-green');
      expect(tileToneClass('warn')).toContain('amber');
      expect(tileToneClass('bad')).toContain('brand-orange');
      expect(tileToneClass('neutral')).toContain('ink');
    });
  });

  describe('formatDiscrepancy', () => {
    it('returns empty for null or zero', () => {
      expect(formatDiscrepancy(null)).toBe('');
      expect(formatDiscrepancy(0)).toBe('');
    });
    it('signs positive and negative amounts', () => {
      expect(formatDiscrepancy(-500)).toContain('-');
      expect(formatDiscrepancy(500)).toContain('+');
    });
  });

  describe('formatStaleAlert', () => {
    it('formats a readable alert line', () => {
      const line = formatStaleAlert({
        campaignTitle: 'Amara Okonkwo',
        amountCents: 40000,
        hoursStale: 72,
      });
      expect(line).toContain('Amara Okonkwo');
      expect(line).toContain('72h');
    });
  });

  describe('needsAttention', () => {
    it('is true with unmatched or discrepancies', () => {
      expect(
        needsAttention({
          matchedCount: 1,
          pendingCount: 0,
          unmatchedCount: 1,
          discrepancyCount: 0,
          bankTxCount: 1,
        }),
      ).toBe(true);
    });
    it('is false when all matched/pending', () => {
      expect(
        needsAttention({
          matchedCount: 2,
          pendingCount: 1,
          unmatchedCount: 0,
          discrepancyCount: 0,
          bankTxCount: 2,
        }),
      ).toBe(false);
    });
  });
});
