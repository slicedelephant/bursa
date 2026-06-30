import { MatchProgram } from './employer-match-lookup';
import {
  buildApplyUrl,
  buildBalanceView,
  buildClaimView,
  buildOfferView,
  ineligibleOffer,
  MatchClaimRow,
} from './match-view';

const program: MatchProgram = {
  domain: 'sap.com',
  employerName: 'SAP',
  matchRatio: 100,
  annualCapCents: 500_000,
  minDonationCents: 1_000,
  integrationLevel: 'PORTAL',
  applyUrlTemplate:
    'https://m.sap.com/apply?amount={amount}&employer={employer}',
  active: true,
};

const labels = { headline: 'h', cta: 'c', balance: 'b' };

describe('ineligibleOffer', () => {
  it('returns an eligible:false view', () => {
    expect(ineligibleOffer().eligible).toBe(false);
  });
});

describe('buildOfferView', () => {
  it('maps program + match into the view', () => {
    const v = buildOfferView(program, 10_000, 490_000, false, labels);
    expect(v.eligible).toBe(true);
    expect(v.employerName).toBe('SAP');
    expect(v.matchCents).toBe(10_000);
    expect(v.remainingAnnualCents).toBe(490_000);
    expect(v.annualCapCents).toBe(500_000);
    expect(v.integrationLevel).toBe('PORTAL');
    expect(v.labels).toBe(labels);
  });
});

describe('buildApplyUrl', () => {
  it('substitutes amount (whole EUR) and employer (encoded)', () => {
    const url = buildApplyUrl(
      program.applyUrlTemplate,
      10_000,
      'Société Générale',
    );
    expect(url).toContain('amount=100');
    expect(url).toContain('employer=Soci%C3%A9t%C3%A9%20G%C3%A9n%C3%A9rale');
  });
  it('returns null without a template', () => {
    expect(buildApplyUrl(null, 10_000, 'SAP')).toBeNull();
    expect(buildApplyUrl(undefined, 10_000, 'SAP')).toBeNull();
  });
});

describe('buildClaimView', () => {
  const baseRow: MatchClaimRow = {
    id: 'claim_1',
    status: 'CLAIMED',
    employerName: 'SAP',
    matchCents: 10_000,
    campaignId: 'camp_1',
    applyUrl: 'https://m.sap.com/apply?amount=100',
    pdfRef: null,
  };

  it('maps a link-level claim', () => {
    const v = buildClaimView(baseRow, 'head', 490_000);
    expect(v.applyUrl).toBe('https://m.sap.com/apply?amount=100');
    expect(v.hasPdf).toBe(false);
    expect(v.documentUrl).toBeUndefined();
    expect(v.statusLabel).toBe('Claimed');
    expect(v.remainingAnnualCents).toBe(490_000);
    expect(v.labels.headline).toBe('head');
  });

  it('maps a PDF-level claim to a document URL', () => {
    const v = buildClaimView(
      { ...baseRow, applyUrl: null, pdfRef: 'pdf_1' },
      'head',
    );
    expect(v.hasPdf).toBe(true);
    expect(v.documentUrl).toBe('/api/matching/me/claims/claim_1/document');
    expect(v.applyUrl).toBeUndefined();
  });
});

describe('buildBalanceView', () => {
  it('computes remaining and maps history', () => {
    const v = buildBalanceView({
      employerName: 'SAP',
      domain: 'sap.com',
      year: 2026,
      annualCapCents: 500_000,
      usedCents: 200_000,
      claims: [
        {
          id: 'c1',
          employerName: 'SAP',
          matchCents: 200_000,
          status: 'CLAIMED',
          campaignTitle: 'Amara',
          schoolName: 'ESMT',
          createdAt: new Date('2026-06-01T00:00:00Z'),
        },
      ],
    });
    expect(v.remainingAnnualCents).toBe(300_000);
    expect(v.usedCents).toBe(200_000);
    expect(v.claims).toHaveLength(1);
    expect(v.claims[0].statusLabel).toBe('Claimed');
    expect(v.claims[0].createdAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('leaves remaining undefined with no employer cap', () => {
    const v = buildBalanceView({ year: 2026, usedCents: 0, claims: [] });
    expect(v.remainingAnnualCents).toBeUndefined();
    expect(v.employerName).toBeUndefined();
  });
});
