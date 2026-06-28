import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { FunnelReport } from '../../../core/models';
import { funnelBars, overallLabel } from './funnel-format';

/** Horizontal funnel bars with conversion + drop-off labels. Presentational. */
@Component({
  selector: 'app-funnel-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="mb-4 flex items-baseline justify-between">
        <h3 class="font-display text-lg font-semibold text-ink">{{ title() }}</h3>
        <span class="text-sm text-slate2">{{ overall() }}</span>
      </div>
      @if (bars().length === 0) {
        <p class="text-sm text-slate2">No funnel data yet.</p>
      } @else {
        <ul class="space-y-3">
          @for (bar of bars(); track bar.key) {
            <li>
              <div class="mb-1 flex justify-between text-sm">
                <span class="font-medium text-ink">{{ bar.label }}</span>
                <span class="text-slate2">
                  {{ bar.count }} · {{ bar.conversionPct }}%
                </span>
              </div>
              <div class="h-3 w-full overflow-hidden rounded-full bg-mist">
                <div
                  class="h-full rounded-full"
                  [class]="bar.highDropOff ? 'bg-brand-orange' : 'bg-brand-green'"
                  [style.width]="bar.widthPercent"
                ></div>
              </div>
              @if (bar.dropOffPct > 0) {
                <p class="mt-1 text-xs text-slate2">−{{ bar.dropOffPct }}% vs previous</p>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class FunnelChartComponent {
  readonly title = input('Funnel');
  readonly report = input.required<FunnelReport>();

  readonly bars = computed(() => funnelBars(this.report()));
  readonly overall = computed(() => overallLabel(this.report()));
}
