import { Component, Input } from '@angular/core';
import { TrustDashboardData, TrustHeatMap } from '../../../core/models';
import { backlogSummary } from './moderation-format';
import { formatPct, riskLevelClass, riskLevelLabel, scoreBarWidth } from './risk-format';

/**
 * Read-only Trust-and-Safety dashboard: KPI tiles, fraud trend, chargeback rate,
 * moderation backlog and a risk heat-map by geography. Presentational only.
 */
@Component({
  selector: 'app-trust-dashboard',
  standalone: true,
  template: `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
        <p class="text-xs uppercase tracking-wide text-slate2">Fraud signals</p>
        <p class="mt-1 text-2xl font-semibold text-ink">{{ data.fraud.totalSignals }}</p>
        <p class="text-xs text-brand-orange">{{ data.fraud.highRiskSignals }} high risk</p>
      </div>
      <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
        <p class="text-xs uppercase tracking-wide text-slate2">Chargeback rate</p>
        <p class="mt-1 text-2xl font-semibold text-ink">
          {{ pct(data.chargebacks.chargebackRatePct) }}
        </p>
        <p class="text-xs text-slate2">
          {{ data.chargebacks.open }} open of {{ data.chargebacks.total }}
        </p>
      </div>
      <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
        <p class="text-xs uppercase tracking-wide text-slate2">Moderation backlog</p>
        <p class="mt-1 text-2xl font-semibold text-ink">{{ data.moderation.backlog }}</p>
        <p class="text-xs text-slate2">{{ backlog() }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
        <p class="text-xs uppercase tracking-wide text-slate2">Frozen</p>
        <p class="mt-1 text-2xl font-semibold text-ink">{{ data.frozen.campaigns }}</p>
        <p class="text-xs text-slate2">{{ data.frozen.donors }} donor accounts</p>
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <div class="rounded-xl bg-white p-5 ring-1 ring-black/5">
        <h3 class="font-display text-lg font-semibold text-ink">Fraud trend</h3>
        <div class="mt-4 flex items-end gap-1" style="height: 80px">
          @for (point of data.fraud.trend; track point.date) {
            <div class="flex flex-1 flex-col items-center justify-end">
              <div
                class="w-full rounded-t bg-brand-blue/70"
                [style.height.%]="(point.count / trendMax()) * 100"
                [title]="point.date + ': ' + point.count"
              ></div>
            </div>
          }
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          @for (k of data.fraud.byKind; track k.key) {
            <span class="rounded-full bg-mist px-2 py-1 text-xs text-slate2">
              {{ k.key }}: {{ k.count }}
            </span>
          }
        </div>
      </div>

      <div class="rounded-xl bg-white p-5 ring-1 ring-black/5">
        <h3 class="font-display text-lg font-semibold text-ink">Risk heat-map</h3>
        @if (heatMap && heatMap.rows.length) {
          <table class="mt-3 w-full text-sm">
            <thead class="text-left text-xs uppercase text-slate2">
              <tr>
                <th class="py-1">Country</th>
                <th class="py-1">Donations</th>
                <th class="py-1">Signals</th>
                <th class="py-1">Chargebacks</th>
                <th class="py-1">Risk</th>
              </tr>
            </thead>
            <tbody>
              @for (row of heatMap.rows; track row.country) {
                <tr class="border-t border-black/5">
                  <td class="py-1.5 font-medium text-ink">{{ row.country }}</td>
                  <td class="py-1.5">{{ row.donationCount }}</td>
                  <td class="py-1.5">{{ row.signalCount }}</td>
                  <td class="py-1.5">{{ row.chargebackCount }}</td>
                  <td class="py-1.5">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs ring-1"
                      [class]="riskClass(row.riskLevel)"
                    >
                      {{ riskLabel(row.riskLevel) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="mt-3 text-sm text-slate2">No geography data yet.</p>
        }
      </div>
    </div>
  `,
})
export class TrustDashboardComponent {
  @Input({ required: true }) data!: TrustDashboardData;
  @Input() heatMap: TrustHeatMap | null = null;

  readonly pct = formatPct;
  readonly riskClass = riskLevelClass;
  readonly riskLabel = riskLevelLabel;
  readonly barWidth = scoreBarWidth;

  backlog(): string {
    return backlogSummary(this.data);
  }

  trendMax(): number {
    return Math.max(1, ...this.data.fraud.trend.map((t) => t.count));
  }
}
