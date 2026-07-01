/**
 * E21 Payroll-HRIS — the single seam between payroll giving and any HRIS
 * (ADP Workforce Now, Workday, Paychex, Paylocity, UKG, BambooHR). The prototype
 * ships MockEmployeeDataProvider (deterministic sample employees, no network). A
 * real adapter must implement this same interface with zero domain changes — the
 * PaymentProvider line. No real OAuth redirect or API call is made by default.
 *
 * The provider is READ-ONLY: it only reads employee data, never writes payroll.
 */

import { PayrollCycle } from './payroll-cycle';

export interface HrisEmployee {
  /** The stable employee id in the HRIS. */
  readonly employeeExternalId: string;
  /** Coarse salary band in integer minor units (cents). */
  readonly salaryBandCents: number;
  readonly payrollCycle: PayrollCycle;
  readonly preTaxEligible: boolean;
  /** Optional work email to link the employee to a Bursa user later. */
  readonly workEmail?: string;
}

export interface EmployeeDataProvider {
  /** List the employees visible under a (mock) HRIS connection reference. */
  listEmployees(connectionRef: string): Promise<HrisEmployee[]>;
}

export const EMPLOYEE_DATA_PROVIDER = Symbol('EMPLOYEE_DATA_PROVIDER');
