import { EMPLOYER_PROGRAMS } from './employer-programs.data';
import { MockEmployerMatchProvider } from './mock-employer-match.provider';

describe('MockEmployerMatchProvider', () => {
  const provider = new MockEmployerMatchProvider();

  it('returns a known program for a known domain', async () => {
    const program = await provider.lookupByDomain('sap.com');
    expect(program?.employerName).toBe('SAP');
    expect(program?.matchRatio).toBe(100);
  });

  it('is case-insensitive on the domain', async () => {
    const program = await provider.lookupByDomain('GOOGLE.COM');
    expect(program?.employerName).toBe('Google');
  });

  it('returns null for an unknown domain', async () => {
    expect(await provider.lookupByDomain('example.org')).toBeNull();
  });

  it('returns even inactive programs (eligibility is decided downstream)', async () => {
    const program = await provider.lookupByDomain('legacycorp.com');
    expect(program?.active).toBe(false);
  });

  it('serves at least 30 well-known employers', () => {
    expect(EMPLOYER_PROGRAMS.length).toBeGreaterThanOrEqual(30);
  });

  it('renders accented employer names verbatim', async () => {
    const program = await provider.lookupByDomain('nestle.com');
    expect(program?.employerName).toBe('Nestlé');
  });
});
