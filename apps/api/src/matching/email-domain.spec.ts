import { extractDomain } from './email-domain';

describe('extractDomain', () => {
  it('extracts the domain from a simple work email', () => {
    expect(extractDomain('jane@sap.com')).toBe('sap.com');
  });

  it('lowercases and trims', () => {
    expect(extractDomain('  Jane.Doe@SAP.COM  ')).toBe('sap.com');
  });

  it('strips a leading mailto:', () => {
    expect(extractDomain('mailto:jane@google.com')).toBe('google.com');
  });

  it('uses the part after the last @', () => {
    expect(extractDomain('weird@name@novartis.com')).toBe('novartis.com');
  });

  it('returns null without an @', () => {
    expect(extractDomain('janesap.com')).toBeNull();
  });

  it('returns null for an empty domain', () => {
    expect(extractDomain('jane@')).toBeNull();
  });

  it('returns null for a dotless domain', () => {
    expect(extractDomain('jane@localhost')).toBeNull();
  });

  it('returns null for a domain with whitespace', () => {
    expect(extractDomain('jane@ sap.com')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(extractDomain(null)).toBeNull();
    expect(extractDomain(undefined)).toBeNull();
  });
});
