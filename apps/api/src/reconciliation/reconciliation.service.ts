import { Inject, Injectable } from '@nestjs/common';
import { DonationStatus } from '@prisma/client';
import { buildSimplePdf } from '../corporate/pdf.util';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  aggregateTransparency,
  TransparencyAggregate,
} from './transparency-aggregator';
import {
  BANK_FEED_PROVIDER,
  type BankFeedPayoutContext,
  type BankFeedProvider,
} from './bank-feed.provider.interface';
import { buildJournal, journalToCsv, JournalPayoutInput } from './double-entry';
import { payoutsToCsv, payoutsToPdfLines } from './reconciliation-export';
import {
  buildReconciliationView,
  PayoutWithTitle,
  ReconciliationView,
} from './reconciliation-view';
import { BankTxForMatch } from './reconciliation-matcher';
import { buildTaxReport, TaxPayoutInput, taxReportToCsv } from './tax-report';

const LOOKBACK_DAYS = 365;

/** Donation statuses that count as "raised" money (mirrors the E8 dashboard). */
const COUNTED_DONATIONS: DonationStatus[] = [
  'SUCCEEDED',
  'CAPTURED',
  'PLEDGED',
];

interface SchoolPayoutRow {
  id: string;
  amountCents: number;
  reference: string;
  status: 'PENDING' | 'SENT' | 'CONFIRMED';
  sentAt: Date | null;
  campaign: { title: string; currency: string };
}

/**
 * E12 — Reconciliation orchestration. Reads the system payouts (E2) + the bank
 * feed (swappable provider), runs the pure reconciliation cores, idempotently
 * persists the bank transactions, records a Reconciliation run, and assembles the
 * CSV/PDF/tax/accounting exports. Reads only — the money path is never mutated;
 * money still flows only to the school.
 */
@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BANK_FEED_PROVIDER) private readonly bankFeed: BankFeedProvider,
  ) {}

  /** Load a school's payouts (with campaign title), newest first. */
  private async loadPayouts(schoolId: string): Promise<SchoolPayoutRow[]> {
    return this.prisma.payout.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amountCents: true,
        reference: true,
        status: true,
        sentAt: true,
        campaign: { select: { title: true, currency: true } },
      },
    }) as unknown as Promise<SchoolPayoutRow[]>;
  }

  private toPayoutContext(row: SchoolPayoutRow): BankFeedPayoutContext {
    return {
      payoutId: row.id,
      amountCents: row.amountCents,
      currency: row.campaign?.currency ?? 'EUR',
      reference: row.reference,
      sentAt: row.sentAt,
    };
  }

  private toPayoutWithTitle(row: SchoolPayoutRow): PayoutWithTitle {
    return {
      payoutId: row.id,
      schoolId: '',
      amountCents: row.amountCents,
      currency: row.campaign?.currency ?? 'EUR',
      reference: row.reference,
      status: row.status,
      sentAt: row.sentAt,
      campaignTitle: row.campaign?.title ?? 'Unknown',
    };
  }

  /** Idempotently persist the fetched bank transactions (upsert on externalId). */
  private async persistBankTx(
    schoolId: string,
    txns: readonly BankTxForMatch[],
    provider: string,
  ): Promise<void> {
    for (const tx of txns) {
      await this.prisma.bankTransaction.upsert({
        where: {
          provider_externalId: { provider, externalId: tx.externalId },
        },
        update: {},
        create: {
          provider,
          externalId: tx.externalId,
          schoolId,
          amountCents: tx.amountCents,
          currency: tx.currency,
          reference: tx.reference,
          postedAt: tx.postedAt,
        },
      });
    }
  }

  /** Run reconciliation for a school and persist a run record. */
  async reconcile(
    schoolId: string,
    now: Date = new Date(),
  ): Promise<ReconciliationView> {
    const rows = await this.loadPayouts(schoolId);
    const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);

    const feed = await this.bankFeed.fetchTransactions({
      schoolId,
      since,
      payouts: rows.map((r) => this.toPayoutContext(r)),
    });

    const bankTx: BankTxForMatch[] = feed.map((t) => ({
      externalId: t.externalId,
      amountCents: t.amountCents,
      currency: t.currency,
      reference: t.reference,
      postedAt: t.postedAt,
    }));

    await this.persistBankTx(
      schoolId,
      bankTx,
      (this.bankFeed as { name?: string }).name ?? 'mock',
    );

    const view = buildReconciliationView(
      schoolId,
      rows.map((r) => this.toPayoutWithTitle(r)),
      bankTx,
      now,
    );

    await this.prisma.reconciliation.create({
      data: {
        schoolId,
        matchedCount: view.summary.matchedCount,
        pendingCount: view.summary.pendingCount,
        unmatchedCount: view.summary.unmatchedCount,
        discrepancyCount: view.summary.discrepancyCount,
        bankTxCount: view.summary.bankTxCount,
        runAt: now,
      },
    });

    return view;
  }

  /** The payout rows of the latest reconciliation (no run record written). */
  async payoutRows(schoolId: string, now: Date = new Date()) {
    const rows = await this.loadPayouts(schoolId);
    const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
    const feed = await this.bankFeed.fetchTransactions({
      schoolId,
      since,
      payouts: rows.map((r) => this.toPayoutContext(r)),
    });
    const bankTx: BankTxForMatch[] = feed.map((t) => ({
      externalId: t.externalId,
      amountCents: t.amountCents,
      currency: t.currency,
      reference: t.reference,
      postedAt: t.postedAt,
    }));
    return buildReconciliationView(
      schoolId,
      rows.map((r) => this.toPayoutWithTitle(r)),
      bankTx,
      now,
    ).rows;
  }

  async exportCsv(schoolId: string): Promise<string> {
    return payoutsToCsv(await this.payoutRows(schoolId));
  }

  async exportPdf(schoolId: string): Promise<string> {
    const lines = payoutsToPdfLines(await this.payoutRows(schoolId));
    return buildSimplePdf('Bursa — Payout Reconciliation', lines);
  }

  async taxReportCsv(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, country: true, iban: true, taxId: true },
    });
    const rows = await this.loadPayouts(schoolId);
    const payouts: TaxPayoutInput[] = rows.map((r) => ({
      payoutId: r.id,
      campaignTitle: r.campaign?.title ?? 'Unknown',
      amountCents: r.amountCents,
      currency: r.campaign?.currency ?? 'EUR',
      sentAt: r.sentAt,
    }));
    const report = buildTaxReport(
      {
        schoolId,
        name: school?.name ?? 'School',
        country: school?.country ?? 'US',
        iban: school?.iban ?? null,
        taxId: school?.taxId ?? null,
      },
      payouts,
    );
    return taxReportToCsv(report);
  }

  async accountingCsv(schoolId: string): Promise<string> {
    const rows = await this.loadPayouts(schoolId);
    const payouts: JournalPayoutInput[] = rows.map((r) => ({
      payoutId: r.id,
      campaignTitle: r.campaign?.title ?? 'Unknown',
      amountCents: r.amountCents,
      sentAt: r.sentAt,
    }));
    return journalToCsv(buildJournal(payouts));
  }

  /**
   * Public, PII-free transparency aggregate for a school (total raised, total
   * paid out, avg donation, donor geography). No individual donors are exposed.
   */
  async transparency(
    schoolId: string,
  ): Promise<TransparencyAggregate & { schoolId: string; schoolName: string }> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });
    if (!school) {
      throw new DomainException('NOT_FOUND', 'School not found', 404);
    }

    const donations = await this.prisma.donation.findMany({
      where: {
        campaign: { schoolId },
        status: { in: COUNTED_DONATIONS },
      },
      select: { amountCents: true, donorCountry: true, campaignId: true },
    });
    const payouts = await this.prisma.payout.findMany({
      where: { schoolId },
      select: { amountCents: true },
    });

    const aggregate = aggregateTransparency(
      donations.map((d) => ({
        amountCents: d.amountCents,
        donorCountry: d.donorCountry,
        campaignId: d.campaignId,
      })),
      payouts.map((p) => ({ amountCents: p.amountCents })),
    );

    return { schoolId: school.id, schoolName: school.name, ...aggregate };
  }
}
