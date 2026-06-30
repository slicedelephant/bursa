import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EsgReport,
  LedgerEntry,
  Prisma,
  ReportStandard,
  StudentProfile,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/audit.service';
import { AnalyticsService } from '../observability/analytics.service';
import { LedgerService } from '../ledger/ledger.service';
import { buildLedgerView } from '../ledger/ledger-view';
import { TagEntryDto } from './dto/tag-entry.dto';
import { DiversityDto } from './dto/diversity.dto';
import { CreateGrantDto } from './dto/create-grant.dto';
import { buildEsgAggregate, LedgerEntryFact } from './esg-aggregate';
import { mapToStandard, reportStandardLabel } from './esg-standard-mapper';
import {
  buildAnnotations,
  EsgReportView,
  SourceEntry,
  toReportCsv,
  toReportPdf,
} from './audit-annotation';
import { computeDataQuality } from './data-quality';
import { buildTrend } from './esg-trend';
import {
  createAuditorToken,
  hashAuditorToken,
  resolveTtlMs,
  validateAuditorToken,
} from './auditor-access-token';

/** Period for a calendar year (UTC). */
function yearPeriod(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
  };
}

function toLedgerFact(e: LedgerEntry): LedgerEntryFact {
  return {
    entryType: e.entryType,
    amountCents: e.amountCents,
    createdAt: e.createdAt,
  };
}

function toSourceEntry(e: LedgerEntry): SourceEntry {
  return {
    sequence: e.sequence,
    entryType: e.entryType,
    amountCents: e.amountCents,
    reason: e.reason,
    entryHash: e.entryHash,
  };
}

/**
 * E14 ESG/CSRD reporting service. A READ/AGGREGATE layer on top of the E12
 * append-only ledger: it reads ledger entries (never appends/updates), tags them
 * additively, captures optional diversity data, maps aggregates onto reporting
 * standards, builds audit-annotated exports (reusing the E5 PDF/CSV utils), and
 * issues time-limited auditor access grants. Report generation and access grants
 * are logged via the E6 AuditService and emitted via the E7 AnalyticsService.
 */
@Injectable()
export class EsgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ---- Compliance tagging -------------------------------------------------

  /** Tag a ledger entry with an ESG category (additive; entry stays immutable). */
  async tagEntry(actorUserId: string, dto: TagEntryDto) {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id: dto.ledgerEntryId },
      select: { id: true },
    });
    if (!entry) {
      throw new NotFoundException('Ledger entry not found');
    }

    const tag = await this.prisma.esgTag.upsert({
      where: { ledgerEntryId: dto.ledgerEntryId },
      update: { category: dto.category, note: dto.note ?? null },
      create: {
        ledgerEntryId: dto.ledgerEntryId,
        category: dto.category,
        note: dto.note ?? null,
        taggedByUserId: actorUserId,
      },
    });

    await this.audit.record({
      action: 'esg.tag_set',
      actorUserId,
      targetType: 'LedgerEntry',
      targetId: dto.ledgerEntryId,
      metadata: { category: dto.category },
    });
    await this.analytics.record({
      type: 'esg.tagged',
      userId: actorUserId,
      metadata: { category: dto.category },
    });

    return {
      id: tag.id,
      ledgerEntryId: tag.ledgerEntryId,
      category: tag.category,
      note: tag.note,
      createdAt: tag.createdAt.toISOString(),
    };
  }

  // ---- Diversity capture --------------------------------------------------

  async setDiversity(studentProfileId: string, dto: DiversityDto) {
    const exists = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Student profile not found');
    }
    const updated: StudentProfile = await this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: {
        gender: dto.gender ?? undefined,
        birthYear: dto.birthYear ?? undefined,
        firstGen: dto.firstGen ?? undefined,
      },
    });
    return {
      studentProfileId: updated.id,
      gender: updated.gender,
      birthYear: updated.birthYear,
      firstGen: updated.firstGen,
    };
  }

  // ---- Report builder -----------------------------------------------------

  /** Build (without persisting) the mapped report for a standard + year. */
  async buildReport(
    standard: ReportStandard,
    year: number,
  ): Promise<EsgReportView> {
    const period = yearPeriod(year);
    const [entries, profiles, tags] = await Promise.all([
      this.entriesInPeriod(period),
      this.prisma.studentProfile.findMany({
        select: {
          gender: true,
          birthYear: true,
          country: true,
          firstGen: true,
        },
      }),
      this.prisma.esgTag.findMany({ select: { category: true } }),
    ]);

    const aggregate = buildEsgAggregate({
      entries: entries.map(toLedgerFact),
      profiles,
      tags,
      refYear: year,
    });
    const metrics = mapToStandard(standard, aggregate);

    // Annotate with the invested (payout/disbursement) source entries.
    const sources = entries
      .filter((e) => e.entryType === 'PAYOUT' || e.entryType === 'DISBURSEMENT')
      .map(toSourceEntry);

    return {
      standard,
      period: { start: period.start, end: period.end },
      metrics,
      annotations: buildAnnotations(sources),
    };
  }

  /** Persist a report snapshot. */
  async createReport(
    actorUserId: string,
    standard: ReportStandard,
    year: number,
  ) {
    const view = await this.buildReport(standard, year);
    const report = await this.prisma.esgReport.create({
      data: {
        standard,
        periodStart: view.period.start as Date,
        periodEnd: view.period.end as Date,
        metricsJson: view as unknown as Prisma.InputJsonValue,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.record({
      action: 'esg.report_generated',
      actorUserId,
      targetType: 'EsgReport',
      targetId: report.id,
      metadata: { standard },
    });
    await this.analytics.record({
      type: 'report.generated',
      userId: actorUserId,
      metadata: { standard },
    });

    return this.toReportSummary(report);
  }

  async listReports() {
    const reports = await this.prisma.esgReport.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((r) => this.toReportSummary(r));
  }

  /** Read a persisted report view (for export). Throws 404 if missing. */
  private async loadReportView(id: string): Promise<EsgReportView> {
    const report = await this.prisma.esgReport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report.metricsJson as unknown as EsgReportView;
  }

  async reportCsv(actorUserId: string, id: string): Promise<string> {
    const view = await this.loadReportView(id);
    await this.recordExport(actorUserId, id, 'csv', view.standard);
    return toReportCsv(view);
  }

  async reportPdf(actorUserId: string, id: string): Promise<string> {
    const view = await this.loadReportView(id);
    await this.recordExport(actorUserId, id, 'pdf', view.standard);
    return toReportPdf(view);
  }

  // ---- Data quality + trend ----------------------------------------------

  async dataQuality() {
    const profiles = await this.prisma.studentProfile.findMany({
      select: { gender: true, birthYear: true, country: true, firstGen: true },
    });
    return computeDataQuality(profiles);
  }

  async trend() {
    const [entries, scholars] = await Promise.all([
      // Read-only via the E12 LedgerService.
      this.ledger.listAllForReporting(),
      this.prisma.studentProfile.findMany({
        select: { gender: true, createdAt: true },
      }),
    ]);
    return buildTrend(entries, scholars);
  }

  // ---- Auditor access grants ---------------------------------------------

  async createGrant(actorUserId: string, dto: CreateGrantDto) {
    const token = createAuditorToken({ ttlMs: resolveTtlMs(dto.ttlHours) });
    const grant = await this.prisma.auditorAccessGrant.create({
      data: {
        label: dto.label,
        tokenHash: token.tokenHash,
        scope: dto.scope ?? null,
        expiresAt: token.expiresAt,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.record({
      action: 'esg.auditor_grant_created',
      actorUserId,
      targetType: 'AuditorAccessGrant',
      targetId: grant.id,
      metadata: { label: dto.label },
    });
    await this.analytics.record({
      type: 'auditor.grant_created',
      userId: actorUserId,
    });

    return {
      id: grant.id,
      label: grant.label,
      token: token.token, // raw token — returned ONCE
      expiresAt: grant.expiresAt.toISOString(),
      portalUrl: `/audit-portal/${token.token}`,
    };
  }

  async revokeGrant(actorUserId: string, id: string) {
    const grant = await this.prisma.auditorAccessGrant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!grant) {
      throw new NotFoundException('Grant not found');
    }
    const updated = await this.prisma.auditorAccessGrant.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      action: 'esg.auditor_grant_revoked',
      actorUserId,
      targetType: 'AuditorAccessGrant',
      targetId: id,
    });
    return {
      id: updated.id,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    };
  }

  async listGrants() {
    const grants = await this.prisma.auditorAccessGrant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();
    return grants.map((g) => ({
      id: g.id,
      label: g.label,
      expiresAt: g.expiresAt.toISOString(),
      revokedAt: g.revokedAt?.toISOString() ?? null,
      lastUsedAt: g.lastUsedAt?.toISOString() ?? null,
      status: g.revokedAt
        ? 'REVOKED'
        : g.expiresAt.getTime() <= now
          ? 'EXPIRED'
          : 'ACTIVE',
    }));
  }

  // ---- Public audit portal (token-gated, read-only) ----------------------

  /**
   * Resolve a raw token to a read-only audit-trail view. Returns a discriminated
   * result so the controller can map to 401/403; never writes anything but the
   * grant's lastUsedAt on success.
   */
  async openAuditPortal(rawToken: string) {
    const grant =
      typeof rawToken === 'string' && rawToken.length > 0
        ? await this.prisma.auditorAccessGrant.findUnique({
            where: { tokenHash: hashAuditorToken(rawToken) },
          })
        : null;

    const validation = validateAuditorToken(
      grant
        ? {
            tokenHash: grant.tokenHash,
            expiresAt: grant.expiresAt,
            revokedAt: grant.revokedAt,
          }
        : null,
      rawToken,
    );
    if (!validation.valid || !grant) {
      return { ok: false as const, reason: validation.reason ?? 'malformed' };
    }

    await this.prisma.auditorAccessGrant.update({
      where: { id: grant.id },
      data: { lastUsedAt: new Date() },
    });
    await this.analytics.record({ type: 'auditor.portal_viewed' });

    const rows = await this.prisma.ledgerEntry.findMany({
      orderBy: [{ schoolId: 'asc' }, { sequence: 'asc' }],
      include: { esgTag: { select: { category: true } } },
    });
    const integrity = globalIntegrity(rows);

    return {
      ok: true as const,
      data: {
        grantLabel: grant.label,
        expiresAt: grant.expiresAt.toISOString(),
        integrity,
        entries: rows.map((r) => ({
          sequence: r.sequence,
          entryType: r.entryType,
          amountCents: r.amountCents,
          currency: r.currency,
          reason: r.reason,
          entryHash: r.entryHash,
          category: r.esgTag?.category ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    };
  }

  // ---- helpers ------------------------------------------------------------

  private async entriesInPeriod(period: {
    start: Date;
    end: Date;
  }): Promise<LedgerEntry[]> {
    // Read-only via the E12 LedgerService — E14 never appends/mutates the ledger.
    return this.ledger.listAllForReporting({
      from: period.start,
      to: period.end,
    });
  }

  private async recordExport(
    actorUserId: string,
    reportId: string,
    format: 'csv' | 'pdf',
    standard: ReportStandard,
  ): Promise<void> {
    await this.audit.record({
      action: 'esg.report_exported',
      actorUserId,
      targetType: 'EsgReport',
      targetId: reportId,
      metadata: { format, standard: reportStandardLabel(standard) },
    });
    await this.analytics.record({
      type: 'report.exported',
      userId: actorUserId,
      metadata: { format },
    });
  }

  private toReportSummary(report: EsgReport) {
    return {
      id: report.id,
      standard: report.standard,
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      createdAt: report.createdAt.toISOString(),
    };
  }
}

/**
 * Verify the ledger chain across all schools for the read-only portal view by
 * reusing the E12 pure `buildLedgerView` (true hash recomputation + sequence +
 * prevHash linkage) per school. Each school's chain is independent.
 */
function globalIntegrity(rows: ReadonlyArray<LedgerEntry>) {
  const bySchool = new Map<string, LedgerEntry[]>();
  for (const r of rows) {
    const list = bySchool.get(r.schoolId) ?? [];
    list.push(r);
    bySchool.set(r.schoolId, list);
  }
  let checked = 0;
  let valid = true;
  let brokenAtSequence: number | null = null;
  for (const [schoolId, list] of bySchool.entries()) {
    const view = buildLedgerView(schoolId, list);
    checked += view.integrity.checkedCount;
    if (!view.integrity.valid) {
      valid = false;
      brokenAtSequence = brokenAtSequence ?? view.integrity.brokenAtSequence;
    }
  }
  return { valid, checkedCount: checked, brokenAtSequence };
}
