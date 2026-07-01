import { Injectable, Logger } from '@nestjs/common';
import {
  EmployeeDataProvider,
  HrisEmployee,
} from './employee-data.provider.interface';

/**
 * Real Workday adapter behind the same EmployeeDataProvider seam. Selected only
 * when HRIS_PROVIDER=workday AND WORKDAY_CLIENT_ID/WORKDAY_CLIENT_SECRET are
 * present (see the factory); otherwise the deterministic Mock is used, so the app
 * runs with no keys and the test suite never touches the network or OAuth.
 *
 * It would call the Workday Staffing REST API over `fetch` with a read-only
 * OAuth2 token (no SDK dependency), so this file compiles with zero extra deps.
 * It is NOT exercised in tests — only the mock runs there. Mirrors
 * AdpEmployeeDataProvider.
 */
@Injectable()
export class WorkdayEmployeeDataProvider implements EmployeeDataProvider {
  readonly name = 'workday';
  private readonly logger = new Logger(WorkdayEmployeeDataProvider.name);
  private static readonly BASE_URL = 'https://api.workday.com/staffing/v1';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    if (!clientId || !clientSecret) {
      throw new Error(
        'WorkdayEmployeeDataProvider requires client id + secret',
      );
    }
  }

  async listEmployees(connectionRef: string): Promise<HrisEmployee[]> {
    // A real implementation exchanges the client credentials for a read-only
    // access token, then GETs /workers, mapping Workday worker records to
    // HrisEmployee. Intentionally not wired in the prototype (out of scope).
    this.logger.warn(
      `Workday employee sync is not enabled in the prototype (connection ${connectionRef}).`,
    );
    throw new Error('Workday integration is not configured');
  }
}
