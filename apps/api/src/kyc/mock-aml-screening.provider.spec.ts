import { MockAmlScreeningProvider } from './mock-aml-screening.provider';

describe('MockAmlScreeningProvider', () => {
  const provider = new MockAmlScreeningProvider();

  it('reports no hit for a clean subject', async () => {
    const result = await provider.screen({
      amountCents: 600000,
      country: 'DE',
      subjectName: 'Acme Corp',
    });
    expect(result.hit).toBe(false);
    expect(result.reference).toMatch(/^mock_aml_/);
  });

  it('reports a hit for the WATCHLIST sentinel', async () => {
    const result = await provider.screen({
      amountCents: 600000,
      country: 'DE',
      subjectName: 'Global Watchlist Holdings',
    });
    expect(result.hit).toBe(true);
  });

  it('handles a missing subject name', async () => {
    const result = await provider.screen({
      amountCents: 600000,
      country: 'DE',
      subjectName: '',
    });
    expect(result.hit).toBe(false);
  });

  it('handles an undefined subject name (nullish fallback)', async () => {
    const result = await provider.screen({
      amountCents: 600000,
      country: 'DE',
      subjectName: undefined as unknown as string,
    });
    expect(result.hit).toBe(false);
  });
});
