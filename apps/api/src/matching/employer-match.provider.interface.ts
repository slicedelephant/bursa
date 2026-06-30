/**
 * The single seam between match detection and any employer-matching database
 * (Double the Donation / Benevity / …). The prototype ships
 * MockEmployerMatchProvider (a deterministic static DB); a real adapter must
 * implement this same interface with zero domain changes. No real call is made
 * anywhere in the prototype by default.
 *
 * The provider only reports the raw program for a domain; eligibility, the match
 * amount, the labels and the claim lifecycle live in the pure cores
 * (`employer-match-lookup.ts`, `match-amount.ts`, `match-labels.ts`,
 * `claim-status.ts`), so the provider stays thin.
 */

import { MatchProgram } from './employer-match-lookup';

export interface EmployerMatchProvider {
  /** Look up the employer match program for a (normalised) domain, or null. */
  lookupByDomain(domain: string): Promise<MatchProgram | null>;
}

export const EMPLOYER_MATCH_PROVIDER = Symbol('EMPLOYER_MATCH_PROVIDER');
