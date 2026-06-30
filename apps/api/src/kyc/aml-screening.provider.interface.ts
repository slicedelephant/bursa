/**
 * The single seam between AML screening and any AML provider (Sumsub / ComplyAdvantage).
 * The prototype ships MockAmlScreeningProvider; a real adapter must implement this
 * same interface with zero domain changes. No real AML call is made anywhere in
 * the prototype.
 *
 * The provider only reports a raw watchlist/PEP hit for a subject; the CLEAR /
 * HIT / BLOCKED decision and the sanctioned-country check live in the pure cores
 * (`aml-decision.ts`, `sanctioned-country.ts`), so the provider stays thin.
 */

export interface AmlScreenRequest {
  readonly amountCents: number;
  readonly country: string;
  /** Subject name for the watchlist screening (the real provider needs it). */
  readonly subjectName: string;
}

export interface AmlScreenResult {
  /** Provider-reported watchlist / PEP / adverse-media hit. */
  readonly hit: boolean;
  readonly reference: string;
}

export interface AmlScreeningProvider {
  /** Screen a subject against watchlists; returns a raw hit flag. */
  screen(request: AmlScreenRequest): Promise<AmlScreenResult>;
}

export const AML_SCREENING_PROVIDER = Symbol('AML_SCREENING_PROVIDER');
