import { Injectable, Logger } from '@nestjs/common';
import { MatchProgram } from './employer-match-lookup';
import { EmployerMatchProvider } from './employer-match.provider.interface';

/**
 * Real Double the Donation adapter behind the same EmployerMatchProvider seam.
 * Selected only when EMPLOYER_MATCH_PROVIDER=dtd AND a DTD_API_KEY is present
 * (see the factory); otherwise the deterministic Mock is used, so the app runs
 * with no keys and the test suite never touches the network.
 *
 * It calls the DTD company-search API over `fetch` (no SDK dependency), so this
 * file compiles with zero extra deps. It is NOT exercised in tests — only the
 * mock runs there. Mirrors StripePaymentProvider / SumsubAmlProvider.
 */
@Injectable()
export class DoubleTheDonationProvider implements EmployerMatchProvider {
  readonly name = 'dtd';
  private readonly logger = new Logger(DoubleTheDonationProvider.name);
  private static readonly BASE_URL = 'https://doublethedonation.com/api/v2';

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error('DoubleTheDonationProvider requires DTD_API_KEY');
    }
  }

  async lookupByDomain(domain: string): Promise<MatchProgram | null> {
    try {
      const res = await fetch(
        `${DoubleTheDonationProvider.BASE_URL}/companies?domain=${encodeURIComponent(domain)}`,
        {
          method: 'GET',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
          },
        },
      );
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`DTD API returned ${res.status}`);
      }
      const json = (await res.json()) as DtdCompany | null;
      return json ? mapDtdCompany(domain, json) : null;
    } catch (error) {
      this.logger.error('DTD lookup failed', error as Error);
      throw error instanceof Error ? error : new Error('DTD lookup failed');
    }
  }
}

interface DtdCompany {
  company_name?: string;
  match_ratio?: number;
  annual_max_match_per_employee?: number;
  minimum_match_amount?: number;
  submission_type?: string;
  guideline_url?: string;
}

/** Map a DTD company payload into our MatchProgram shape (skeleton mapping). */
function mapDtdCompany(domain: string, company: DtdCompany): MatchProgram {
  const level: MatchProgram['integrationLevel'] =
    company.submission_type === 'electronic'
      ? 'AUTO_SUBMIT'
      : company.submission_type === 'portal'
        ? 'PORTAL'
        : 'MANUAL';
  return {
    domain,
    employerName: company.company_name ?? domain,
    matchRatio: Math.round((company.match_ratio ?? 1) * 100),
    annualCapCents: Math.round(
      (company.annual_max_match_per_employee ?? 0) * 100,
    ),
    minDonationCents: Math.round((company.minimum_match_amount ?? 0) * 100),
    integrationLevel: level,
    applyUrlTemplate: company.guideline_url ?? null,
    active: true,
  };
}
