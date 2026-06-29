import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { SchoolDashboard, StudentPayoutStatus } from '../../core/models';
import {
  dashboardTiles,
  formatEur,
  geographyBars,
  payoutStatusClass,
  payoutStatusLabel,
} from './school-dashboard-format';

/** Real-time school dashboard: KPI tiles, per-student payout status, donor geography. */
@Component({
  selector: 'app-school-dashboard',
  standalone: true,
  imports: [],
  template: `
    @if (error()) {
      <p class="rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange" role="alert">
        {{ error() }}
      </p>
    }

    @if (data(); as d) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (tile of tiles(); track tile.label) {
          <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <p class="text-xs uppercase tracking-wide text-slate2">{{ tile.label }}</p>
            <p class="mt-1 font-display text-2xl font-semibold text-ink">{{ tile.value }}</p>
          </div>
        }
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <h3 class="mb-4 font-display text-lg font-semibold text-ink">Students & payout status</h3>
          @if (d.students.length === 0) {
            <p class="text-sm text-slate2">No campaigns yet.</p>
          }
          <ul class="divide-y divide-slate-100">
            @for (s of d.students; track s.campaignId) {
              <li class="flex items-center justify-between gap-3 py-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-ink">{{ s.studentName }}</p>
                  <p class="truncate text-xs text-slate2">
                    {{ eur(s.raisedCents) }} / {{ eur(s.goalCents) }} · {{ s.progressPct }}%
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                  [class]="payoutCls(s.payoutStatus)"
                >
                  {{ payoutLabel(s.payoutStatus) }}
                </span>
              </li>
            }
          </ul>
        </div>

        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <h3 class="mb-4 font-display text-lg font-semibold text-ink">Donors by geography</h3>
          @if (geo().length === 0) {
            <p class="text-sm text-slate2">No donations yet.</p>
          }
          <div class="space-y-3">
            @for (row of geo(); track row.country) {
              <div>
                <div class="mb-1 flex items-baseline justify-between text-sm">
                  <span class="text-ink">{{ row.country }}</span>
                  <span class="text-slate2">{{ row.amountLabel }} · {{ row.donationCount }}</span>
                </div>
                <div class="h-2 w-full rounded-full bg-mist">
                  <div class="h-2 rounded-full bg-brand-green" [style.width]="row.widthPercent"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class SchoolDashboardComponent {
  private readonly api = inject(ApiService);

  readonly data = signal<SchoolDashboard | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.schoolDashboard().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.error.set('Could not load the dashboard.'),
    });
  }

  tiles() {
    const d = this.data();
    return d ? dashboardTiles(d.totals) : [];
  }

  geo() {
    const d = this.data();
    return d ? geographyBars(d.donorGeography) : [];
  }

  payoutLabel(status: StudentPayoutStatus): string {
    return payoutStatusLabel(status);
  }

  payoutCls(status: StudentPayoutStatus): string {
    return payoutStatusClass(status);
  }

  eur(cents: number): string {
    return formatEur(cents);
  }
}
