/**
 * E21 — Payroll-Match & HRIS-Kopplung (orchestration).
 *
 * Thin service over the pure cores + reused infra. Money NEVER touches an employee
 * or student: every matched payroll contribution is booked as a CORPORATE donation
 * onto the SCHOOL's campaign and recorded in the E12 append-only ledger against the
 * SCHOOL (Constitution II + IV). Employee data comes only through the
 * `EmployeeDataProvider` seam (mock by default). The match amount reuses the E13
 * `computeMatch` (via `match-rule.ts`). Every connect/sync/campaign writes an E6
 * audit-trail entry. Returns plain data; the `{success,data,error}` envelope is
 * applied by the global interceptor. Boundary errors throw `DomainException`.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { Campaign } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { splitContribution } from '../donations/contribution.util';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../security/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { summarizeCampaign, type CampaignLine } from './campaign-summary';
import {
  EMPLOYEE_DATA_PROVIDER,
  type EmployeeDataProvider,
} from './employee-data.provider.interface';
import { resolveEligibility } from './employee-eligibility';
import { applyPayrollMatchRule } from './match-rule';
import { computeDeduction } from './payroll-deduction';
import { buildSyncLog } from './sync-log';
import { validateReadOnlyScopes } from './oauth-scope-validator';
import type {
  ActivateEmployeeDto,
  ConfigureRuleDto,
  ConnectHrisDto,
  HrisWebhookDto,
  RunCampaignDto,
  SyncHrisDto,
} from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    @Inject(EMPLOYEE_DATA_PROVIDER)
    private readonly employees: EmployeeDataProvider,
    @Optional() private readonly now: () => Date = () => new Date(),
  ) {}

  // ---- HRIS connection ------------------------------------------------------

  /** Connect an HRIS: enforce read-only scopes, persist the connection + program. */
  async connectHris(dto: ConnectHrisDto) {
    const scopeCheck = validateReadOnlyScopes(dto.scopes);
    if (!scopeCheck.valid) {
      throw new DomainException(
        'INVALID_SCOPES',
        scopeCheck.reason ?? 'Only read-only scopes are allowed',
        400,
      );
    }

    const profile = await this.prisma.corporateProfile.findUnique({
      where: { id: dto.corporateProfileId },
    });
    if (!profile) {
      throw new DomainException(
        'NOT_FOUND',
        'Corporate profile not found',
        404,
      );
    }

    const { connection, program } = await this.prisma.$transaction(
      async (tx) => {
        const connection = await tx.hrisConnection.create({
          data: {
            corporateProfileId: dto.corporateProfileId,
            provider: dto.provider,
            scopes: dto.scopes,
            status: 'CONNECTED',
            externalRef: `mock_hris_${dto.provider.toLowerCase()}_${Date.now()}`,
          },
        });
        const program = await tx.payrollGivingProgram.create({
          data: {
            corporateProfileId: dto.corporateProfileId,
            hrisConnectionId: connection.id,
            name: dto.programName,
          },
        });
        return { connection, program };
      },
    );

    await this.audit.record({
      action: 'payroll.hris.connect',
      targetType: 'HrisConnection',
      targetId: connection.id,
      metadata: { provider: dto.provider, scopeCount: dto.scopes.length },
    });

    return {
      connectionId: connection.id,
      provider: connection.provider,
      status: connection.status,
      scopes: connection.scopes,
      programId: program.id,
    };
  }

  /** Sync employees from a connected HRIS via the provider seam (mock by default). */
  async syncEmployees(dto: SyncHrisDto) {
    const connection = await this.prisma.hrisConnection.findUnique({
      where: { id: dto.connectionId },
    });
    if (!connection) {
      throw new DomainException('NOT_FOUND', 'HRIS connection not found', 404);
    }
    if (connection.status !== 'CONNECTED' && connection.status !== 'SYNCED') {
      throw new DomainException(
        'NOT_CONNECTED',
        'HRIS connection is not in a syncable state',
        409,
      );
    }

    const roster = await this.employees.listEmployees(
      connection.externalRef ?? connection.id,
    );

    for (const emp of roster) {
      const linkedUser = emp.workEmail
        ? await this.prisma.user.findUnique({ where: { email: emp.workEmail } })
        : null;
      await this.prisma.employeePayrollProfile.upsert({
        where: {
          hrisConnectionId_employeeExternalId: {
            hrisConnectionId: connection.id,
            employeeExternalId: emp.employeeExternalId,
          },
        },
        create: {
          hrisConnectionId: connection.id,
          userId: linkedUser?.id ?? null,
          employeeExternalId: emp.employeeExternalId,
          salaryBandCents: emp.salaryBandCents,
          payrollCycle: emp.payrollCycle,
          preTaxEligible: emp.preTaxEligible,
        },
        update: {
          salaryBandCents: emp.salaryBandCents,
          payrollCycle: emp.payrollCycle,
          preTaxEligible: emp.preTaxEligible,
          userId: linkedUser?.id ?? undefined,
        },
      });
    }

    const syncedAt = this.now();
    await this.prisma.hrisConnection.update({
      where: { id: connection.id },
      data: { status: 'SYNCED', lastSyncedAt: syncedAt },
    });

    const log = buildSyncLog({
      provider: connection.provider,
      connectionId: connection.id,
      scopes: connection.scopes,
      employeeCount: roster.length,
      at: syncedAt,
    });
    await this.audit.record({
      action: log.action,
      targetType: 'HrisConnection',
      targetId: connection.id,
      metadata: {
        provider: log.provider,
        employeeCount: log.employeeCount,
        readOnly: log.readOnly,
      },
    });

    return {
      connectionId: connection.id,
      status: 'SYNCED',
      employeeCount: roster.length,
      syncedAt: syncedAt.toISOString(),
    };
  }

  // ---- Rule + employee opt-in ----------------------------------------------

  /** Set/update the firm-wide match rule (ratio + per-employee cap). */
  async configureRule(dto: ConfigureRuleDto) {
    if (dto.matchRatio < 0 || dto.perEmployeeCapCents < 0) {
      throw new DomainException(
        'INVALID_RULE',
        'Match ratio and cap must be non-negative',
        400,
      );
    }
    const program = await this.prisma.payrollGivingProgram.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new DomainException('NOT_FOUND', 'Program not found', 404);
    }

    const rule = await this.prisma.payrollMatchRule.upsert({
      where: { programId: dto.programId },
      create: {
        programId: dto.programId,
        matchRatio: dto.matchRatio,
        perEmployeeCapCents: dto.perEmployeeCapCents,
      },
      update: {
        matchRatio: dto.matchRatio,
        perEmployeeCapCents: dto.perEmployeeCapCents,
      },
    });

    return {
      programId: rule.programId,
      matchRatio: rule.matchRatio,
      perEmployeeCapCents: rule.perEmployeeCapCents,
    };
  }

  /** List synced employees for a connection + activation + remaining budget. */
  async listEmployees(connectionId: string) {
    const connection = await this.prisma.hrisConnection.findUnique({
      where: { id: connectionId },
      include: { program: { include: { matchRule: true } } },
    });
    if (!connection) {
      throw new DomainException('NOT_FOUND', 'HRIS connection not found', 404);
    }
    const cap = connection.program?.matchRule?.perEmployeeCapCents ?? 0;
    const profiles = await this.prisma.employeePayrollProfile.findMany({
      where: { hrisConnectionId: connectionId },
      orderBy: { employeeExternalId: 'asc' },
    });
    const year = this.currentYear();

    return {
      activatedCount: profiles.filter((p) => p.active).length,
      totalCount: profiles.length,
      employees: profiles.map((p) => ({
        id: p.id,
        employeeExternalId: p.employeeExternalId,
        active: p.active,
        payrollCycle: p.payrollCycle,
        remainingCents: Math.max(0, cap - this.usedThisYear(p, year)),
      })),
    };
  }

  /** Employee-side payroll-giving opt-in. */
  async activateEmployee(dto: ActivateEmployeeDto) {
    const profile = await this.prisma.employeePayrollProfile.findUnique({
      where: { id: dto.employeeProfileId },
      include: {
        hrisConnection: {
          include: { program: { include: { matchRule: true } } },
        },
      },
    });
    if (!profile) {
      throw new DomainException('NOT_FOUND', 'Employee profile not found', 404);
    }

    const updated = await this.prisma.employeePayrollProfile.update({
      where: { id: profile.id },
      data: { active: true },
    });
    const cap =
      profile.hrisConnection.program?.matchRule?.perEmployeeCapCents ?? 0;

    return {
      employeeProfileId: updated.id,
      active: updated.active,
      remainingCents: Math.max(
        0,
        cap - this.usedThisYear(updated, this.currentYear()),
      ),
    };
  }

  // ---- Campaign run ("match month") ----------------------------------------

  /**
   * Run a payroll-giving campaign. For each active employee: compute the E13 match
   * (capped by the per-employee balance), book a CORPORATE donation onto the
   * SCHOOL's campaign, append a ledger DONATION to the SCHOOL, record the
   * PayrollContribution and emit a mock payroll-deduction line-item. Money to the
   * school, never to the employee/student.
   */
  async runCampaign(dto: RunCampaignDto) {
    if (dto.defaultContributionCents < 1) {
      throw new DomainException(
        'INVALID_AMOUNT',
        'Contribution too small',
        400,
      );
    }

    const program = await this.prisma.payrollGivingProgram.findUnique({
      where: { id: dto.programId },
      include: { matchRule: true, hrisConnection: true },
    });
    if (!program) {
      throw new DomainException('NOT_FOUND', 'Program not found', 404);
    }
    if (!program.matchRule) {
      throw new DomainException('NO_RULE', 'No match rule configured', 409);
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
      include: { school: true },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }

    const activeEmployees = await this.prisma.employeePayrollProfile.findMany({
      where: { hrisConnectionId: program.hrisConnectionId, active: true },
      orderBy: { employeeExternalId: 'asc' },
    });
    if (activeEmployees.length === 0) {
      throw new DomainException(
        'NO_ACTIVE_EMPLOYEES',
        'No activated employees for this program',
        409,
      );
    }

    const year = this.currentYear();
    const lines: CampaignLine[] = [];

    for (const employee of activeEmployees) {
      const eligibility = resolveEligibility({
        salaryBandCents: employee.salaryBandCents,
        preTaxEligible: employee.preTaxEligible,
        active: employee.active,
        programActive: program.active,
      });
      if (!eligibility.eligible) continue;

      const deduction = computeDeduction({
        contributionCents: dto.defaultContributionCents,
        preTax: dto.preTax && eligibility.preTaxAllowed,
        taxRatePercent: dto.taxRatePercent,
      });

      const used = this.usedThisYear(employee, year);
      const match = applyPayrollMatchRule({
        contributionCents: deduction.grossCents,
        matchRatio: program.matchRule.matchRatio,
        perEmployeeCapCents: program.matchRule.perEmployeeCapCents,
        usedCents: used,
      });

      await this.commitContribution({
        program,
        employeeId: employee.id,
        campaign,
        contributionCents: deduction.grossCents,
        matchCents: match.matchCents,
        newUsedCents: match.newUsedCents,
        preTax: deduction.preTax,
        year,
      });

      lines.push({
        contributionCents: deduction.grossCents,
        matchCents: match.matchCents,
      });
    }

    await this.audit.record({
      action: 'payroll.campaign.run',
      targetType: 'PayrollGivingProgram',
      targetId: program.id,
      metadata: { campaignId: campaign.id, contributions: lines.length },
    });

    const summary = summarizeCampaign(lines);
    return {
      programId: program.id,
      campaignId: campaign.id,
      contributions: summary.contributions,
      totalContributionCents: summary.totalContributionCents,
      totalMatchCents: summary.totalMatchCents,
      totalToSchoolCents: summary.totalToSchoolCents,
    };
  }

  /** Read-only compliance/sync trail (E6 audit entries scoped to payroll actions). */
  async complianceTrail() {
    const entries = await this.audit.list();
    return entries
      .filter((e) => e.action.startsWith('payroll.'))
      .map((e) => ({
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        createdAt: e.createdAt,
        metadata: e.metadata,
      }));
  }

  /** Apply a signed HRIS webhook status update to a connection. */
  async applyWebhook(dto: HrisWebhookDto) {
    const connection = await this.prisma.hrisConnection.findUnique({
      where: { id: dto.connectionId },
    });
    if (!connection) {
      throw new DomainException('NOT_FOUND', 'HRIS connection not found', 404);
    }
    const status = dto.status === 'ERROR' ? 'ERROR' : 'SYNCED';
    await this.prisma.hrisConnection.update({
      where: { id: connection.id },
      data: { status },
    });
    return { connectionId: connection.id, status };
  }

  // ---- helpers -------------------------------------------------------------

  private currentYear(): number {
    return this.now().getFullYear();
  }

  /** Match cents used this calendar year (0 if the profile's year has rolled). */
  private usedThisYear(
    profile: { matchYear: number | null; matchUsedCents: number },
    year: number,
  ): number {
    return profile.matchYear === year ? profile.matchUsedCents : 0;
  }

  /**
   * Commit one employee's payroll contribution: the matched CORPORATE donation to
   * the SCHOOL's campaign, the append-only ledger entry to the SCHOOL, the
   * PayrollContribution row, and the per-employee balance update — all transactional.
   */
  private async commitContribution(input: {
    program: { id: string };
    employeeId: string;
    campaign: Campaign & { school: { id: string; name: string } };
    contributionCents: number;
    matchCents: number;
    newUsedCents: number;
    preTax: boolean;
    year: number;
  }): Promise<void> {
    const { campaign, matchCents } = input;
    // Cap the booked match at the campaign's remaining gap (E2 over-funding rule).
    const { amountToGoal } = splitContribution(
      campaign.goalCents,
      campaign.raisedCents,
      matchCents,
    );
    const bookedMatch = Math.max(0, amountToGoal);

    await this.prisma.$transaction(async (tx) => {
      let matchDonationId: string | null = null;
      if (bookedMatch > 0) {
        const matchDonation = await tx.donation.create({
          data: {
            campaignId: campaign.id,
            amountCents: bookedMatch,
            method: 'SEPA',
            type: 'CORPORATE',
            status: 'SUCCEEDED',
            providerRef: `mock_payroll_match_${input.employeeId}_${input.year}`,
            donorName: 'Payroll match',
          },
        });
        matchDonationId = matchDonation.id;

        await tx.campaign.update({
          where: { id: campaign.id },
          data: {
            raisedCents: { increment: bookedMatch },
            ...(campaign.raisedCents + bookedMatch >= campaign.goalCents &&
            campaign.status !== 'FUNDED'
              ? { status: 'FUNDED' }
              : {}),
          },
        });
      }

      const entry = await this.ledger.append({
        entryType: 'DONATION',
        amountCents: bookedMatch,
        currency: campaign.currency,
        schoolId: campaign.school.id,
        reason: 'Payroll-match gift to school',
        refType: 'payroll_contribution',
        refId: matchDonationId ?? `payroll_${input.employeeId}`,
      });

      await tx.payrollContribution.create({
        data: {
          programId: input.program.id,
          employeeProfileId: input.employeeId,
          campaignId: campaign.id,
          schoolId: campaign.school.id,
          contributionCents: input.contributionCents,
          matchCents: bookedMatch,
          preTax: input.preTax,
          matchDonationId,
          ledgerSequence: entry.sequence,
          deductionRef: `mock_payroll_line_${input.employeeId}_${input.year}`,
          year: input.year,
        },
      });

      await tx.employeePayrollProfile.update({
        where: { id: input.employeeId },
        data: { matchYear: input.year, matchUsedCents: input.newUsedCents },
      });
    });
  }
}
