import { Injectable, Logger } from '@nestjs/common';
import {
  EmployeeDataProvider,
  HrisEmployee,
} from './employee-data.provider.interface';

/**
 * Real ADP Workforce Now adapter behind the same EmployeeDataProvider seam.
 * Selected only when HRIS_PROVIDER=adp AND ADP_CLIENT_ID/ADP_CLIENT_SECRET are
 * present (see the factory); otherwise the deterministic Mock is used, so the app
 * runs with no keys and the test suite never touches the network or OAuth.
 *
 * It would call the ADP Workers API over `fetch` with a read-only OAuth2 token
 * (no SDK dependency), so this file compiles with zero extra deps. It is NOT
 * exercised in tests — only the mock runs there. Mirrors StripePaymentProvider /
 * DoubleTheDonationProvider.
 */
@Injectable()
export class AdpEmployeeDataProvider implements EmployeeDataProvider {
  readonly name = 'adp';
  private readonly logger = new Logger(AdpEmployeeDataProvider.name);
  private static readonly BASE_URL = 'https://api.adp.com/hr/v2';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    if (!clientId || !clientSecret) {
      throw new Error('AdpEmployeeDataProvider requires client id + secret');
    }
  }

  async listEmployees(connectionRef: string): Promise<HrisEmployee[]> {
    // A real implementation exchanges the client credentials for a read-only
    // access token, then GETs /workers, mapping ADP worker records to
    // HrisEmployee. Intentionally not wired in the prototype (out of scope).
    this.logger.warn(
      `ADP employee sync is not enabled in the prototype (connection ${connectionRef}).`,
    );
    throw new Error('ADP integration is not configured');
  }
}
