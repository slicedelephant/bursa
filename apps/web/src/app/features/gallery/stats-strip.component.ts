import { Component, Input } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { Stats } from '../../core/models';

/** Four-tile impact strip fed by api.stats(). */
@Component({
  selector: 'app-stats-strip',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-black/5">
        <p class="font-display text-3xl font-bold text-brand-green">
          {{ stats.totalRaisedCents | money }}
        </p>
        <p class="mt-1 text-sm font-medium text-slate2">Total raised</p>
      </div>

      <div class="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-black/5">
        <p class="font-display text-3xl font-bold text-ink">{{ stats.studentsFunded }}</p>
        <p class="mt-1 text-sm font-medium text-slate2">Students funded</p>
      </div>

      <div class="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-black/5">
        <p class="font-display text-3xl font-bold text-ink">{{ stats.campaignsLive }}</p>
        <p class="mt-1 text-sm font-medium text-slate2">Campaigns live</p>
      </div>

      <div class="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-black/5">
        <p class="font-display text-3xl font-bold text-ink">{{ stats.schools }}</p>
        <p class="mt-1 text-sm font-medium text-slate2">Schools</p>
      </div>
    </div>
  `,
})
export class StatsStripComponent {
  @Input({ required: true }) stats!: Stats;
}
