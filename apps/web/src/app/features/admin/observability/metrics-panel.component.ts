import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HealthReport, ObsMetrics, PaymentAlert } from '../../../core/models';
import {
  formatUptime,
  healthClass,
  healthLabel,
  metricTiles,
  severityClass,
} from './metrics-format';

/** System metrics tiles + health badge + derived payment alerts. Presentational. */
@Component({
  selector: 'app-metrics-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="font-display text-lg font-semibold text-ink">System metrics</h3>
        @if (health(); as h) {
          <span class="text-sm font-medium" [class]="healthCls(h)">
            {{ healthTxt(h) }} · up {{ uptime(h.uptimeSeconds) }}
          </span>
        }
      </div>

      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        @for (tile of tiles(); track tile.label) {
          <div class="rounded-xl bg-mist px-4 py-3">
            <dt class="text-xs uppercase tracking-wide text-slate2">{{ tile.label }}</dt>
            <dd class="mt-1 font-display text-xl font-semibold text-ink">{{ tile.value }}</dd>
          </div>
        }
      </dl>

      <div class="mt-5">
        <h4 class="mb-2 text-sm font-semibold text-ink">Payment alerts</h4>
        @if (alerts().length === 0) {
          <p class="text-sm text-brand-green">No active payment alerts.</p>
        } @else {
          <ul class="space-y-2">
            @for (alert of alerts(); track alert.kind) {
              <li
                class="flex items-center justify-between rounded-lg px-3 py-2 text-sm ring-1"
                [class]="chip(alert)"
              >
                <span>{{ alert.message }}</span>
                <span class="font-semibold uppercase">{{ alert.severity }}</span>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class MetricsPanelComponent {
  readonly metrics = input.required<ObsMetrics>();
  readonly alerts = input<PaymentAlert[]>([]);
  readonly health = input<HealthReport | null>(null);

  readonly tiles = computed(() => metricTiles(this.metrics()));

  // Thin delegates to the tested pure helpers; only called with a non-null health
  // value (template guards with `@if (health(); as h)`), so no dead branches here.
  healthTxt(h: HealthReport): string {
    return healthLabel(h);
  }
  healthCls(h: HealthReport): string {
    return healthClass(h);
  }
  uptime(seconds: number): string {
    return formatUptime(seconds);
  }
  chip(alert: PaymentAlert): string {
    return severityClass(alert.severity);
  }
}
