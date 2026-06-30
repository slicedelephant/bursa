import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CsrdReportView, ReportStandard } from '../../core/models';
import { formatMetricValue, REPORT_STANDARDS, shortHash } from './csrd-format';

/**
 * CSRD report builder: a standard picker + generate button, the mapped metrics,
 * and audit-annotation footnotes tying figures back to source ledger entries.
 * Export is delegated to the parent (auth-aware blob download / persist).
 */
@Component({
  selector: 'app-report-builder',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-display text-xl font-semibold text-ink">Report builder</h2>
          <p class="text-sm text-slate2">
            Map your immutable ledger onto a reporting standard (illustrative).
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <label>
            <span class="block text-xs font-medium text-slate2">Standard</span>
            <select
              [(ngModel)]="standard"
              class="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              @for (s of standards; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </label>
          <button
            type="button"
            (click)="generate.emit(standard)"
            class="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white"
          >
            Generate
          </button>
          <button
            type="button"
            (click)="exportCsv.emit(standard)"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-mist"
          >
            CSV
          </button>
          <button
            type="button"
            (click)="exportPdf.emit(standard)"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-mist"
          >
            PDF
          </button>
        </div>
      </div>

      @if (report; as r) {
        <table class="mt-5 w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-left text-slate2">
              <th class="py-2">Code</th>
              <th class="py-2">Metric</th>
              <th class="py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            @for (m of r.metrics; track m.code) {
              <tr class="border-b border-slate-50">
                <td class="py-2 font-mono text-xs text-slate2">{{ m.code }}</td>
                <td class="py-2 text-ink">{{ m.label }}</td>
                <td class="py-2 font-medium text-ink">{{ value(m) }}</td>
              </tr>
            }
          </tbody>
        </table>

        @if (r.annotations.length) {
          <div class="mt-5">
            <h3 class="text-sm font-semibold text-ink">
              Audit annotations (source ledger entries)
            </h3>
            <ul class="mt-2 space-y-1 text-xs text-slate2">
              @for (a of r.annotations; track a.ref) {
                <li>
                  [{{ a.ref }}] seq {{ a.sequence }} · {{ a.entryType }} ·
                  <span class="font-mono">{{ hash(a.entryHash) }}</span>
                </li>
              }
            </ul>
          </div>
        }
      } @else {
        <p class="mt-5 text-sm text-slate2">
          Pick a standard and generate a report to preview the mapped metrics.
        </p>
      }
    </div>
  `,
})
export class ReportBuilderComponent {
  @Input() report: CsrdReportView | null = null;
  @Output() generate = new EventEmitter<ReportStandard>();
  @Output() exportCsv = new EventEmitter<ReportStandard>();
  @Output() exportPdf = new EventEmitter<ReportStandard>();

  standards = REPORT_STANDARDS;
  standard: ReportStandard = 'GRI_2024';

  value = formatMetricValue;
  hash = shortHash;
}
