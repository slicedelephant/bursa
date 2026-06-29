import { MockEsignatureProvider } from './mock-e-signature.provider';

describe('MockEsignatureProvider', () => {
  it('signs an agreement and echoes the (trimmed) signer', async () => {
    const clock = () => new Date('2026-06-29T10:00:00.000Z');
    const provider = new MockEsignatureProvider(clock);
    const signed = await provider.signAgreement({
      schoolId: 'school1',
      schoolName: 'ESMT Berlin',
      signerName: '  Jane Bursar  ',
    });
    expect(signed.provider).toBe('mock');
    expect(signed.signerName).toBe('Jane Bursar');
    expect(signed.agreementRef).toMatch(/^mock_esign_[0-9a-f]{16}$/);
    expect(signed.signedAt.toISOString()).toBe('2026-06-29T10:00:00.000Z');
  });

  it('is deterministic for the same input + clock', async () => {
    const clock = () => new Date('2026-06-29T10:00:00.000Z');
    const a = await new MockEsignatureProvider(clock).signAgreement({
      schoolId: 'school1',
      schoolName: 'ESMT',
      signerName: 'Jane',
    });
    const b = await new MockEsignatureProvider(clock).signAgreement({
      schoolId: 'school1',
      schoolName: 'ESMT',
      signerName: 'Jane',
    });
    expect(a.agreementRef).toBe(b.agreementRef);
  });

  it('uses the system clock by default', async () => {
    const signed = await new MockEsignatureProvider().signAgreement({
      schoolId: 's',
      schoolName: 'x',
      signerName: 'Jane',
    });
    expect(signed.signedAt).toBeInstanceOf(Date);
  });

  it('rejects an empty signer name', async () => {
    const provider = new MockEsignatureProvider();
    await expect(
      provider.signAgreement({ schoolId: 's', schoolName: 'x', signerName: '   ' }),
    ).rejects.toThrow(/signerName is required/);
  });
});
