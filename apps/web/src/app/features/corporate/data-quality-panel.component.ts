import { Component, Input } from '@angular/core';
import { DataQualityReport } from '../../core/models';
import { barWidth, collectMoreHint, completenessClass, fieldLabel } from './data-quality-format';

/**
 * Data-quality / completeness panel: per-field capture rate + an overall score.
 * Presentational only — all numbers come from the pure data-quality core.
 */
@Component({
  selector: 'app-data-quality-panel',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="font-display text-xl font-semibold text-ink">Data quality</h2>
          <p class="text-sm text-slate2">Diversity-data completeness across scholars.</p>
        </div>
        <p class="text-2xl font-semibold" [class]="overallClass()">{{ report.overallPct }}%</p>
      </div>

      <ul class="mt-5 space-y-4">
        @for (f of report.fields; track f.field) {
          <li>
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-ink">{{ label(f.field) }}</span>
              <span [class]="pctClass(f.pct)">{{ f.captured }}/{{ f.total }} · {{ f.pct }}%</span>
            </div>
            <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-mist">
              <div class="h-full rounded-full bg-brand-green" [style.width]="width(f.pct)"></div>
            </div>
            @if (hint(f); as h) {
              <p class="mt-1 text-xs text-brand-orange">{{ h }}</p>
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class DataQualityPanelComponent {
  @Input({ required: true }) report!: DataQualityReport;

  label = fieldLabel;
  width = barWidth;
  pctClass = completenessClass;
  hint = collectMoreHint;

  overallClass(): string {
    return completenessClass(this.report.overallPct);
  }
}
