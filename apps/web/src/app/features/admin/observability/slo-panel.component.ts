import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SloReport } from '../../../core/models';
import { alertClass, alertLabel, objectiveLabel, windowRows } from './slo-format';

/** SLO + multi-window burn-rate panel with the escalation banner. Presentational. */
@Component({
  selector: 'app-slo-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="mb-3 flex items-baseline justify-between">
        <h3 class="font-display text-lg font-semibold text-ink">Service level objective</h3>
        <span class="text-sm text-slate2">{{ objective() }}</span>
      </div>

      <div class="mb-4 rounded-lg px-4 py-2 text-sm font-semibold ring-1" [class]="bannerCls()">
        {{ bannerTxt() }}
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-slate2">
            <th class="pb-2">Window</th>
            <th class="pb-2">SLI</th>
            <th class="pb-2">Burn rate</th>
            <th class="pb-2">Budget</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.label) {
            <tr class="border-t border-black/5">
              <td class="py-2 text-ink">{{ row.label }}</td>
              <td class="py-2 text-slate2">{{ row.sliPct }}%</td>
              <td class="py-2 font-semibold" [class]="row.burnClass">{{ row.burnRate }}×</td>
              <td class="py-2 text-slate2">{{ row.budgetConsumedPct }}%</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class SloPanelComponent {
  readonly report = input.required<SloReport>();

  readonly rows = computed(() => windowRows(this.report()));
  readonly bannerTxt = computed(() => alertLabel(this.report()));
  readonly bannerCls = computed(() => alertClass(this.report()));
  readonly objective = computed(() => objectiveLabel(this.report()));
}
