import { MockIdentityVerificationProvider } from './mock-identity-verification.provider';

describe('MockIdentityVerificationProvider', () => {
  const provider = new MockIdentityVerificationProvider();

  describe('checkLiveness', () => {
    it('returns a high confidence for a normal token', async () => {
      const result = await provider.checkLiveness({
        livenessToken: 'live_demo_ok',
      });
      expect(result.confidence).toBeGreaterThanOrEqual(70);
      expect(result.reference).toMatch(/^mock_liveness_/);
    });

    it('returns a low confidence for the -FAIL sentinel', async () => {
      const result = await provider.checkLiveness({
        livenessToken: 'live_demo-FAIL',
      });
      expect(result.confidence).toBeLessThan(70);
    });

    it('handles an undefined liveness token (nullish fallback)', async () => {
      const result = await provider.checkLiveness({
        livenessToken: undefined as unknown as string,
      });
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });
  });

  describe('extractDocument', () => {
    it('echoes the claimed name on the happy path', async () => {
      const result = await provider.extractDocument({
        documentToken: 'doc_demo_ok',
        claimedName: 'Amara Okonkwo',
      });
      expect(result.extractedName).toBe('Amara Okonkwo');
      expect(result.reference).toMatch(/^mock_document_/);
    });

    it('returns a different name for the -MISMATCH sentinel', async () => {
      const result = await provider.extractDocument({
        documentToken: 'doc_demo-MISMATCH',
        claimedName: 'Amara Okonkwo',
      });
      expect(result.extractedName).not.toBe('Amara Okonkwo');
    });

    it('handles undefined token + claimed name (nullish fallbacks)', async () => {
      const result = await provider.extractDocument({
        documentToken: undefined as unknown as string,
        claimedName: undefined as unknown as string,
      });
      expect(result.extractedName).toBe('');
    });
  });
});
