import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import {
  HealthReport,
  ObsFunnel,
  ObsMetrics,
  PaymentAlert,
  SloReport,
} from '../../../core/models';
import { FunnelChartComponent } from './funnel-chart.component';
import { MetricsPanelComponent } from './metrics-panel.component';
import { SloPanelComponent } from './slo-panel.component';

/**
 * Operator observability dashboard (ADMIN). Loads the funnel, system metrics,
 * SLO/burn-rate, payment alerts and health probe and composes the presentational
 * panels. Read-only — it never touches money or verification state.
 */
@Component({
  selector: 'app-observability-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    FunnelChartComponent,
    MetricsPanelComponent,
    SloPanelComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-semibold text-ink">Observability</h1>
          <p class="mt-1 text-sm text-slate2">
            Funnel, system metrics, payment health and the donation-flow SLO.
          </p>
        </div>
        <a
          routerLink="/admin"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          Back to admin
        </a>
      </header>

      @if (error()) {
        <p class="rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange" role="alert">
          {{ error() }}
        </p>
      }

      <div class="grid gap-6 lg:grid-cols-2">
        @if (funnel(); as f) {
          <app-funnel-chart title="Donation funnel" [report]="f.donation" />
          <app-funnel-chart title="Onboarding funnel" [report]="f.onboarding" />
        }
        @if (metrics(); as m) {
          <app-metrics-panel [metrics]="m" [alerts]="alerts()" [health]="health()" />
        }
        @if (slo(); as s) {
          <app-slo-panel [report]="s" />
        }
      </div>
    </section>
  `,
})
export class ObservabilityDashboardComponent {
  private readonly api = inject(ApiService);

  readonly funnel = signal<ObsFunnel | null>(null);
  readonly metrics = signal<ObsMetrics | null>(null);
  readonly slo = signal<SloReport | null>(null);
  readonly alerts = signal<PaymentAlert[]>([]);
  readonly health = signal<HealthReport | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.obsFunnel().subscribe({
      next: (f) => this.funnel.set(f),
      error: () => this.error.set('Could not load observability data.'),
    });
    this.api.obsMetrics().subscribe({ next: (m) => this.metrics.set(m) });
    this.api.obsSlo().subscribe({ next: (s) => this.slo.set(s) });
    this.api
      .obsPaymentAlerts()
      .subscribe({ next: (a) => this.alerts.set(a.alerts) });
    this.api.health().subscribe({ next: (h) => this.health.set(h) });
  }
}
