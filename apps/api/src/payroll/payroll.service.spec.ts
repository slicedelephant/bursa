import { PayrollService } from './payroll.service';
import { MockEmployeeDataProvider } from './mock-employee-data.provider';
import type { LedgerService } from '../ledger/ledger.service';
import type { AuditService } from '../security/audit.service';

/** Runs an action and returns the DomainException `code` it throws. */
async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

const CLOCK = () => new Date('2026-06-29T10:00:00.000Z');
const YEAR = 2026;

/** A tx double whose model methods mirror the prisma double. */
function txDouble() {
  return {
    hrisConnection: { create: jest.fn(), update: jest.fn() },
    payrollGivingProgram: { create: jest.fn() },
    donation: { create: jest.fn(async () => ({ id: 'don_1' })) },
    campaign: { update: jest.fn() },
    payrollContribution: { create: jest.fn() },
    employeePayrollProfile: { update: jest.fn() },
  };
}

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const tx = txDouble();
  return {
    _tx: tx,
    corporateProfile: { findUnique: jest.fn() },
    hrisConnection: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payrollGivingProgram: { create: jest.fn(), findUnique: jest.fn() },
    payrollMatchRule: { upsert: jest.fn() },
    employeePayrollProfile: {
      upsert: jest.fn(),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    campaign: { findUnique: jest.fn() },
    donation: { create: jest.fn(async () => ({ id: 'don_1' })) },
    user: { findUnique: jest.fn(async () => null) },
    $transaction: jest.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
    ...overrides,
  } as never;
}

function buildService(prisma: unknown) {
  const ledger = {
    append: jest.fn(async () => ({ sequence: 5 })),
  } as unknown as LedgerService;
  const audit = {
    record: jest.fn(),
    list: jest.fn(),
  } as unknown as AuditService;
  const employees = new MockEmployeeDataProvider();
  const service = new PayrollService(
    prisma as never,
    ledger,
    audit,
    employees,
    CLOCK,
  );
  return { service, ledger, audit };
}

describe('PayrollService (E21)', () => {
  describe('connectHris', () => {
    it('rejects a write scope', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.connectHris({
            corporateProfileId: 'cp_1',
            provider: 'ADP' as never,
            scopes: ['employees.read', 'payroll.write'],
            programName: 'ACME',
          }),
        ),
      ).toBe('INVALID_SCOPES');
    });

    it('404 when the corporate profile is missing', async () => {
      const prisma = buildPrisma();
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.connectHris({
            corporateProfileId: 'nope',
            provider: 'ADP' as never,
            scopes: ['employees.read'],
            programName: 'ACME',
          }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('connects with read-only scopes and audits', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { corporateProfile: { findUnique: jest.Mock } }
      ).corporateProfile.findUnique.mockResolvedValue({ id: 'cp_1' });
      const tx = (prisma as never as { _tx: ReturnType<typeof txDouble> })._tx;
      tx.hrisConnection.create.mockResolvedValue({
        id: 'conn_1',
        provider: 'ADP',
        status: 'CONNECTED',
        scopes: ['employees.read'],
      });
      tx.payrollGivingProgram.create.mockResolvedValue({ id: 'prog_1' });

      const { service, audit } = buildService(prisma);
      const r = await service.connectHris({
        corporateProfileId: 'cp_1',
        provider: 'ADP' as never,
        scopes: ['employees.read'],
        programName: 'ACME',
      });
      expect(r.status).toBe('CONNECTED');
      expect(r.programId).toBe('prog_1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payroll.hris.connect' }),
      );
    });
  });

  describe('syncEmployees', () => {
    it('404 when the connection is missing', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() => service.syncEmployees({ connectionId: 'nope' })),
      ).toBe('NOT_FOUND');
    });

    it('409 when the connection is not syncable', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { hrisConnection: { findUnique: jest.Mock } }
      ).hrisConnection.findUnique.mockResolvedValue({
        id: 'conn_1',
        status: 'REVOKED',
        scopes: [],
        provider: 'ADP',
      });
      const { service } = buildService(prisma);
      expect(
        await codeOf(() => service.syncEmployees({ connectionId: 'conn_1' })),
      ).toBe('NOT_CONNECTED');
    });

    it('syncs the mock roster, marks SYNCED and audits', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { hrisConnection: { findUnique: jest.Mock } }
      ).hrisConnection.findUnique.mockResolvedValue({
        id: 'conn_1',
        status: 'CONNECTED',
        scopes: ['employees.read'],
        provider: 'ADP',
        externalRef: 'ext_1',
      });
      const { service, audit } = buildService(prisma);
      const r = await service.syncEmployees({ connectionId: 'conn_1' });
      expect(r.status).toBe('SYNCED');
      expect(r.employeeCount).toBe(3);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payroll.hris.sync' }),
      );
    });
  });

  describe('configureRule', () => {
    it('rejects a negative rule', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.configureRule({
            programId: 'prog_1',
            matchRatio: -1,
            perEmployeeCapCents: 0,
          }),
        ),
      ).toBe('INVALID_RULE');
    });

    it('404 when the program is missing', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.configureRule({
            programId: 'nope',
            matchRatio: 100,
            perEmployeeCapCents: 50_000,
          }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('upserts the rule', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { payrollGivingProgram: { findUnique: jest.Mock } }
      ).payrollGivingProgram.findUnique.mockResolvedValue({ id: 'prog_1' });
      (
        prisma as never as { payrollMatchRule: { upsert: jest.Mock } }
      ).payrollMatchRule.upsert.mockResolvedValue({
        programId: 'prog_1',
        matchRatio: 100,
        perEmployeeCapCents: 50_000,
      });
      const { service } = buildService(prisma);
      const r = await service.configureRule({
        programId: 'prog_1',
        matchRatio: 100,
        perEmployeeCapCents: 50_000,
      });
      expect(r.matchRatio).toBe(100);
    });
  });

  describe('listEmployees + activateEmployee', () => {
    it('lists with remaining budget', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { hrisConnection: { findUnique: jest.Mock } }
      ).hrisConnection.findUnique.mockResolvedValue({
        id: 'conn_1',
        program: { matchRule: { perEmployeeCapCents: 50_000 } },
      });
      (
        prisma as never as { employeePayrollProfile: { findMany: jest.Mock } }
      ).employeePayrollProfile.findMany.mockResolvedValue([
        {
          id: 'ep_1',
          employeeExternalId: 'EMP-1',
          active: true,
          payrollCycle: 'MONTHLY',
          matchYear: YEAR,
          matchUsedCents: 10_000,
        },
      ]);
      const { service } = buildService(prisma);
      const r = await service.listEmployees('conn_1');
      expect(r.activatedCount).toBe(1);
      expect(r.employees[0].remainingCents).toBe(40_000);
    });

    it('404 when listing an unknown connection', async () => {
      const { service } = buildService(buildPrisma());
      expect(await codeOf(() => service.listEmployees('nope'))).toBe(
        'NOT_FOUND',
      );
    });

    it('activates an employee opt-in', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          employeePayrollProfile: { findUnique: jest.Mock; update: jest.Mock };
        }
      ).employeePayrollProfile.findUnique.mockResolvedValue({
        id: 'ep_1',
        hrisConnection: {
          program: { matchRule: { perEmployeeCapCents: 50_000 } },
        },
      });
      (
        prisma as never as { employeePayrollProfile: { update: jest.Mock } }
      ).employeePayrollProfile.update.mockResolvedValue({
        id: 'ep_1',
        active: true,
        matchYear: null,
        matchUsedCents: 0,
      });
      const { service } = buildService(prisma);
      const r = await service.activateEmployee({ employeeProfileId: 'ep_1' });
      expect(r.active).toBe(true);
      expect(r.remainingCents).toBe(50_000);
    });

    it('404 activating an unknown profile', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.activateEmployee({ employeeProfileId: 'nope' }),
        ),
      ).toBe('NOT_FOUND');
    });
  });

  describe('runCampaign', () => {
    const program = {
      id: 'prog_1',
      active: true,
      hrisConnectionId: 'conn_1',
      matchRule: { matchRatio: 100, perEmployeeCapCents: 50_000 },
    };
    const campaign = {
      id: 'camp_1',
      goalCents: 1_000_000,
      raisedCents: 0,
      status: 'LIVE',
      currency: 'EUR',
      school: { id: 'sch_1', name: 'ESMT' },
    };

    it('rejects a tiny contribution', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.runCampaign({
            programId: 'prog_1',
            campaignId: 'camp_1',
            defaultContributionCents: 0,
          }),
        ),
      ).toBe('INVALID_AMOUNT');
    });

    it('404 when the program is missing', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.runCampaign({
            programId: 'nope',
            campaignId: 'camp_1',
            defaultContributionCents: 10_000,
          }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('409 when there is no match rule', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { payrollGivingProgram: { findUnique: jest.Mock } }
      ).payrollGivingProgram.findUnique.mockResolvedValue({
        ...program,
        matchRule: null,
      });
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.runCampaign({
            programId: 'prog_1',
            campaignId: 'camp_1',
            defaultContributionCents: 10_000,
          }),
        ),
      ).toBe('NO_RULE');
    });

    it('404 when the campaign is missing', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { payrollGivingProgram: { findUnique: jest.Mock } }
      ).payrollGivingProgram.findUnique.mockResolvedValue(program);
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.runCampaign({
            programId: 'prog_1',
            campaignId: 'nope',
            defaultContributionCents: 10_000,
          }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('409 when there are no active employees', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { payrollGivingProgram: { findUnique: jest.Mock } }
      ).payrollGivingProgram.findUnique.mockResolvedValue(program);
      (
        prisma as never as { campaign: { findUnique: jest.Mock } }
      ).campaign.findUnique.mockResolvedValue(campaign);
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.runCampaign({
            programId: 'prog_1',
            campaignId: 'camp_1',
            defaultContributionCents: 10_000,
          }),
        ),
      ).toBe('NO_ACTIVE_EMPLOYEES');
    });

    it('books a matched CORPORATE gift to the school and ledger entry', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { payrollGivingProgram: { findUnique: jest.Mock } }
      ).payrollGivingProgram.findUnique.mockResolvedValue(program);
      (
        prisma as never as { campaign: { findUnique: jest.Mock } }
      ).campaign.findUnique.mockResolvedValue(campaign);
      (
        prisma as never as { employeePayrollProfile: { findMany: jest.Mock } }
      ).employeePayrollProfile.findMany.mockResolvedValue([
        {
          id: 'ep_1',
          salaryBandCents: 6_000_000,
          preTaxEligible: true,
          active: true,
          payrollCycle: 'MONTHLY',
          matchYear: null,
          matchUsedCents: 0,
        },
      ]);
      const { service, ledger, audit } = buildService(prisma);
      const tx = (prisma as never as { _tx: ReturnType<typeof txDouble> })._tx;

      const r = await service.runCampaign({
        programId: 'prog_1',
        campaignId: 'camp_1',
        defaultContributionCents: 10_000,
      });

      expect(r.contributions).toBe(1);
      expect(r.totalMatchCents).toBe(10_000);
      expect(r.totalToSchoolCents).toBe(20_000);
      // the matched donation is a CORPORATE gift on the school's campaign
      expect(tx.donation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'CORPORATE',
            campaignId: 'camp_1',
          }),
        }),
      );
      // ledger entry targets the SCHOOL
      expect(ledger.append).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 'sch_1', entryType: 'DONATION' }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payroll.campaign.run' }),
      );
    });

    it('skips ineligible (inactive-program) employees without booking money', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { payrollGivingProgram: { findUnique: jest.Mock } }
      ).payrollGivingProgram.findUnique.mockResolvedValue({
        ...program,
        active: false,
      });
      (
        prisma as never as { campaign: { findUnique: jest.Mock } }
      ).campaign.findUnique.mockResolvedValue(campaign);
      (
        prisma as never as { employeePayrollProfile: { findMany: jest.Mock } }
      ).employeePayrollProfile.findMany.mockResolvedValue([
        {
          id: 'ep_1',
          salaryBandCents: 6_000_000,
          preTaxEligible: true,
          active: true,
          payrollCycle: 'MONTHLY',
          matchYear: null,
          matchUsedCents: 0,
        },
      ]);
      const { service } = buildService(prisma);
      const tx = (prisma as never as { _tx: ReturnType<typeof txDouble> })._tx;
      const r = await service.runCampaign({
        programId: 'prog_1',
        campaignId: 'camp_1',
        defaultContributionCents: 10_000,
      });
      expect(r.contributions).toBe(0);
      expect(tx.donation.create).not.toHaveBeenCalled();
    });
  });

  describe('complianceTrail + applyWebhook', () => {
    it('filters audit entries to payroll actions', async () => {
      const prisma = buildPrisma();
      const { service, audit } = buildService(prisma);
      (audit.list as jest.Mock).mockResolvedValue([
        {
          action: 'payroll.hris.connect',
          targetType: 'x',
          targetId: 'y',
          createdAt: new Date(),
          metadata: null,
        },
        {
          action: 'other.thing',
          targetType: 'x',
          targetId: 'y',
          createdAt: new Date(),
          metadata: null,
        },
      ]);
      const trail = await service.complianceTrail();
      expect(trail).toHaveLength(1);
      expect(trail[0].action).toBe('payroll.hris.connect');
    });

    it('applies a SYNCED webhook', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { hrisConnection: { findUnique: jest.Mock } }
      ).hrisConnection.findUnique.mockResolvedValue({ id: 'conn_1' });
      const { service } = buildService(prisma);
      const r = await service.applyWebhook({
        connectionId: 'conn_1',
        status: 'SYNCED',
      });
      expect(r.status).toBe('SYNCED');
    });

    it('applies an ERROR webhook', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { hrisConnection: { findUnique: jest.Mock } }
      ).hrisConnection.findUnique.mockResolvedValue({ id: 'conn_1' });
      const { service } = buildService(prisma);
      const r = await service.applyWebhook({
        connectionId: 'conn_1',
        status: 'ERROR',
      });
      expect(r.status).toBe('ERROR');
    });

    it('404 on an unknown webhook connection', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.applyWebhook({ connectionId: 'nope', status: 'SYNCED' }),
        ),
      ).toBe('NOT_FOUND');
    });
  });
});
