import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import {
  LedgerView,
  PayoutRowView,
  ReconciliationRowStatus,
  ReconciliationView,
  StaleAlertView,
} from '../../core/models';
import {
  formatDiscrepancy,
  formatEur,
  formatStaleAlert,
  needsAttention,
  reconStatusClass,
  reconStatusLabel,
  summaryTiles,
  SummaryTile,
  tileToneClass,
} from './reconciliation-format';

/**
 * E12 — Payout reconciliation panel for the school portal. Shows the matched/
 * unmatched/pending payout table with discrepancy flags + 48h alerts, export
 * buttons, and the append-only ledger integrity. Self-loads via the ApiService;
 * all formatting goes through the pure `reconciliation-format` helpers.
 */
@Component({
  selector: 'app-school-reconciliation',
  standalone: true,
  imports: [],
  template: `
    @if (error()) {
      <p class="rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange" role="alert">
        {{ error() }}
      </p>
    }

    @if (data(); as d) {
      <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (tile of tiles(); track tile.label) {
          <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <p class="text-xs uppercase tracking-wide text-slate2">{{ tile.label }}</p>
            <p class="mt-1 font-display text-2xl font-semibold" [class]="toneClass(tile)">
              {{ tile.value }}
            </p>
          </div>
        }
      </div>

      <div class="mb-6 flex flex-wrap gap-2">
        <a
          [href]="exportUrl('csv')"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          Export CSV
        </a>
        <a
          [href]="exportUrl('pdf')"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          Export PDF
        </a>
        <a
          [href]="exportUrl('tax')"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          Tax report
        </a>
        <a
          [href]="exportUrl('accounting')"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          Accounting (double-entry)
        </a>
      </div>

      @if (alerts().length > 0) {
        <div class="mb-6 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200" role="alert">
          <p class="mb-2 text-sm font-semibold text-rose-700">
            Payouts unconfirmed by the bank after 48h
          </p>
          <ul class="space-y-1 text-sm text-rose-700">
            @for (a of alerts(); track a.payoutId) {
              <li>{{ alertLine(a) }}</li>
            }
          </ul>
        </div>
      }

      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h3 class="mb-4 font-display text-lg font-semibold text-ink">
          Payouts &amp; bank reconciliation
        </h3>
        @if (d.rows.length === 0) {
          <p class="text-sm text-slate2">No payouts yet.</p>
        }
        <ul class="divide-y divide-slate-100">
          @for (r of d.rows; track r.payoutId) {
            <li class="flex items-center justify-between gap-3 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-ink">{{ r.campaignTitle }}</p>
                <p class="truncate text-xs text-slate2">
                  {{ eur(r.amountCents) }} · {{ r.payoutStatus }}
                  @if (r.discrepancyCents !== null) {
                    · {{ discrepancy(r.discrepancyCents) }}
                  }
                </p>
              </div>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                [class]="statusClass(r.reconciliationStatus)"
              >
                {{ statusLabel(r.reconciliationStatus) }}
              </span>
            </li>
          }
        </ul>
      </div>

      @if (ledger(); as l) {
        <div class="mt-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="font-display text-lg font-semibold text-ink">Transaction ledger</h3>
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
              [class]="
                l.integrity.valid
                  ? 'bg-brand-green/10 text-brand-green ring-brand-green/30'
                  : 'bg-brand-orange/10 text-brand-orange ring-brand-orange/30'
              "
            >
              {{ integrityLabel(l) }}
            </span>
          </div>
          <ul class="divide-y divide-slate-100 text-sm">
            @for (e of l.entries; track e.sequence) {
              <li class="flex items-center justify-between gap-3 py-2">
                <span class="truncate text-ink"
                  >#{{ e.sequence }} {{ e.entryType }} — {{ e.reason }}</span
                >
                <span class="shrink-0 text-slate2">{{ eur(e.amountCents) }}</span>
              </li>
            }
          </ul>
        </div>
      }
    }
  `,
})
export class SchoolReconciliationComponent {
  private readonly api = inject(ApiService);

  readonly data = signal<ReconciliationView | null>(null);
  readonly ledger = signal<LedgerView | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.schoolReconciliation().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.error.set('Could not load the reconciliation.'),
    });
    this.api.schoolLedger().subscribe({
      next: (l) => this.ledger.set(l),
      error: () => {
        /* ledger is supplementary; ignore load errors */
      },
    });
  }

  tiles(): SummaryTile[] {
    const d = this.data();
    return d ? summaryTiles(d.summary) : [];
  }

  alerts(): StaleAlertView[] {
    return this.data()?.alerts ?? [];
  }

  rows(): PayoutRowView[] {
    return this.data()?.rows ?? [];
  }

  attention(): boolean {
    const d = this.data();
    return d ? needsAttention(d.summary) : false;
  }

  exportUrl(kind: 'csv' | 'pdf' | 'tax' | 'accounting'): string {
    return this.api.reconciliationExportUrl(kind);
  }

  statusLabel(status: ReconciliationRowStatus): string {
    return reconStatusLabel(status);
  }

  statusClass(status: ReconciliationRowStatus): string {
    return reconStatusClass(status);
  }

  toneClass(tile: SummaryTile): string {
    return tileToneClass(tile.tone);
  }

  eur(cents: number): string {
    return formatEur(cents);
  }

  discrepancy(cents: number | null): string {
    return formatDiscrepancy(cents);
  }

  alertLine(alert: StaleAlertView): string {
    return formatStaleAlert(alert);
  }

  integrityLabel(ledger: LedgerView): string {
    return ledger.integrity.valid
      ? `Verified · ${ledger.integrity.checkedCount} entries`
      : `Broken at #${ledger.integrity.brokenAtSequence}`;
  }
}
