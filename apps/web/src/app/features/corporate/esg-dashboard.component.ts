import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { EsgDashboard } from '../../core/models';
import { esgTiles } from './esg-format';

/**
 * Corporate ESG / CSR impact dashboard: metric tiles + CSV/PDF export buttons.
 * Export is delegated to the parent (auth-aware blob download).
 */
@Component({
  selector: 'app-esg-dashboard',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-display text-xl font-semibold text-ink">ESG / CSR impact</h2>
          <p class="text-sm text-slate2">Audit-ready figures for your CSRD/ESRS reporting.</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            (click)="exportCsv.emit()"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-mist"
          >
            Export CSV
          </button>
          <button
            type="button"
            (click)="exportPdf.emit()"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-mist"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        @for (t of tiles(); track t.key) {
          <div class="rounded-xl bg-mist p-4">
            <p class="text-xs uppercase tracking-wide text-slate2">{{ t.label }}</p>
            <p class="mt-1 font-display text-2xl font-bold text-ink">
              @if (t.money) {
                {{ t.value | money }}
              } @else {
                {{ t.value }}
              }
            </p>
          </div>
        }
      </div>

      @if (!dashboard.rows.length) {
        <p class="mt-5 text-sm text-slate2">
          No corporate sponsorships yet. Sponsor a campaign to build your impact report.
        </p>
      }
    </div>
  `,
})
export class EsgDashboardComponent {
  @Input({ required: true }) dashboard!: EsgDashboard;
  @Output() exportCsv = new EventEmitter<void>();
  @Output() exportPdf = new EventEmitter<void>();

  tiles() {
    return esgTiles(this.dashboard.metrics);
  }
}
