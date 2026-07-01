import { MockEmployeeDataProvider } from './mock-employee-data.provider';

describe('MockEmployeeDataProvider', () => {
  const provider = new MockEmployeeDataProvider();

  it('returns a deterministic roster', async () => {
    const a = await provider.listEmployees('conn_1');
    const b = await provider.listEmployees('conn_2');
    expect(a).toHaveLength(3);
    expect(a.map((e) => e.employeeExternalId)).toEqual(
      b.map((e) => e.employeeExternalId),
    );
  });

  it('exposes salary band, cycle and pre-tax flag', async () => {
    const [first] = await provider.listEmployees('conn_1');
    expect(first.salaryBandCents).toBeGreaterThan(0);
    expect(first.payrollCycle).toBe('MONTHLY');
    expect(typeof first.preTaxEligible).toBe('boolean');
  });

  it('returns fresh objects each call (no shared mutation)', async () => {
    const a = await provider.listEmployees('conn_1');
    a[0].salaryBandCents = -1;
    const b = await provider.listEmployees('conn_1');
    expect(b[0].salaryBandCents).toBeGreaterThan(0);
  });
});
