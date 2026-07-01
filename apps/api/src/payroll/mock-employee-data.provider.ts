import { Injectable } from '@nestjs/common';
import {
  EmployeeDataProvider,
  HrisEmployee,
} from './employee-data.provider.interface';

/**
 * Deterministic mock HRIS employee provider — no network, no OAuth. Returns a small
 * fixed roster derived from the connection reference so tests and the seed are stable.
 * A real ADP/Workday adapter implements the same interface (see the skeletons).
 */
@Injectable()
export class MockEmployeeDataProvider implements EmployeeDataProvider {
  readonly name = 'mock';

  /** A fixed sample roster. Salary bands are integer cents (e.g. €60k = 6_000_000). */
  private static readonly ROSTER: readonly HrisEmployee[] = [
    {
      employeeExternalId: 'EMP-1001',
      salaryBandCents: 6_000_000,
      payrollCycle: 'MONTHLY',
      preTaxEligible: true,
      workEmail: 'alex@acme.test',
    },
    {
      employeeExternalId: 'EMP-1002',
      salaryBandCents: 4_500_000,
      payrollCycle: 'BIWEEKLY',
      preTaxEligible: false,
      workEmail: 'sam@acme.test',
    },
    {
      employeeExternalId: 'EMP-1003',
      salaryBandCents: 9_000_000,
      payrollCycle: 'SEMIMONTHLY',
      preTaxEligible: true,
      workEmail: 'jordan@acme.test',
    },
  ];

  async listEmployees(_connectionRef: string): Promise<HrisEmployee[]> {
    // New array + new objects each call — never leak the internal roster (immutability).
    return MockEmployeeDataProvider.ROSTER.map((e) => ({ ...e }));
  }
}
