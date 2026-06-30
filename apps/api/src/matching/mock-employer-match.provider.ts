import { Injectable } from '@nestjs/common';
import { MatchProgram } from './employer-match-lookup';
import { findProgramByDomain } from './employer-programs.data';
import { EmployerMatchProvider } from './employer-match.provider.interface';

/**
 * Deterministic, no-network employer-match provider. Serves the static
 * `EMPLOYER_PROGRAMS` list. Used by default and in ALL tests — mirrors
 * MockPaymentProvider / MockAmlScreeningProvider.
 */
@Injectable()
export class MockEmployerMatchProvider implements EmployerMatchProvider {
  readonly name = 'mock';

  lookupByDomain(domain: string): Promise<MatchProgram | null> {
    return Promise.resolve(findProgramByDomain(domain));
  }
}
