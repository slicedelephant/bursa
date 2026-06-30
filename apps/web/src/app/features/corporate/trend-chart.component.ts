import { Component, Input } from '@angular/core';
import { TrendDelta, TrendReport } from '../../core/models';
import { deltaArrow, deltaClass, signed } from './trend-format';

/**
 * Year-over-year trend table for board presentations: invested EUR, scholar count
 * and female share per year, with the delta to the previous year. Presentational
 * only — all numbers come from the pure trend core.
 */
@Component({
  selector: 'app-trend-chart',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-xl font-semibold text-ink">Year-over-year trend</h2>
      <p class="text-sm text-slate2">EUR invested, scholars supported and diversity per year.</p>

      @if (report.years.length) {
        <table class="mt-5 w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-left text-slate2">
              <th class="py-2">Year</th>
              <th class="py-2">Invested (EUR)</th>
              <th class="py-2">Scholars</th>
              <th class="py-2">Female %</th>
              <th class="py-2">YoY</th>
            </tr>
          </thead>
          <tbody>
            @for (y of report.years; track y.year) {
              <tr class="border-b border-slate-50">
                <td class="py-2 font-medium text-ink">{{ y.year }}</td>
                <td class="py-2">{{ y.investedEur.toLocaleString() }}</td>
                <td class="py-2">{{ y.scholarCount }}</td>
                <td class="py-2">{{ y.femaleSharePct }}%</td>
                <td class="py-2">
                  @if (deltaFor(y.year); as d) {
                    <span [class]="cls(d.investedEurDelta)">
                      {{ arrow(d.investedEurDelta) }} {{ sign(d.investedEurDelta) }} EUR
                    </span>
                  } @else {
                    <span class="text-slate2">–</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="mt-5 text-sm text-slate2">No trend data yet.</p>
      }
    </div>
  `,
})
export class TrendChartComponent {
  @Input({ required: true }) report!: TrendReport;

  arrow = deltaArrow;
  cls = deltaClass;
  sign = signed;

  deltaFor(year: number): TrendDelta | undefined {
    return this.report.deltas.find((d) => d.year === year);
  }
}
