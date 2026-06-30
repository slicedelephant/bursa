import { SponsorshipForRecognition, toRecognition } from './recognition.util';

const sp = (
  over: Partial<SponsorshipForRecognition> = {},
): SponsorshipForRecognition => ({
  recognitionKind: 'NAMED',
  scholarshipName: 'The Acme Capital Scholarship',
  corporateProfile: { companyName: 'Acme Capital', logoUrl: null },
  ...over,
});

describe('toRecognition', () => {
  it('includes named and logo sponsorships', () => {
    const out = toRecognition([
      sp(),
      sp({
        recognitionKind: 'LOGO',
        scholarshipName: null,
        corporateProfile: {
          companyName: 'Globex',
          logoUrl: 'http://x/logo.png',
        },
      }),
    ]);
    expect(out).toEqual([
      {
        companyName: 'Acme Capital',
        logoUrl: null,
        scholarshipName: 'The Acme Capital Scholarship',
      },
      {
        companyName: 'Globex',
        logoUrl: 'http://x/logo.png',
        scholarshipName: null,
      },
    ]);
  });

  it('omits anonymous sponsorships', () => {
    const out = toRecognition([
      sp({ recognitionKind: 'ANONYMOUS', scholarshipName: null }),
      sp(),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].companyName).toBe('Acme Capital');
  });

  it('returns an empty array for no sponsorships', () => {
    expect(toRecognition([])).toEqual([]);
    expect(toRecognition(undefined)).toEqual([]);
  });
});
