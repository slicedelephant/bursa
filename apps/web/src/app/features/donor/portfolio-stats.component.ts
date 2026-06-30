import { Component, input } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { CumulativeStats, PeerComparison } from '../../core/models';
import { StatTile, peerComparisonText, statTiles } from './portfolio-stats';

/** Presentational cumulative stats grid + a motivating peer comparison line. */
@Component({
  selector: 'app-portfolio-stats',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Your impact</h2>
      <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        @for (tile of tiles(); track tile.label) {
          <div>
            <p class="text-xs uppercase tracking-wide text-slate2">{{ tile.label }}</p>
            <p class="mt-1 font-display text-xl font-bold text-ink">
              @if (tile.money) {
                {{ tile.value | money: true }}
              } @else {
                {{ tile.value }}
              }
            </p>
          </div>
        }
      </div>
      <p class="mt-4 rounded-lg bg-brand-green/10 px-4 py-2 text-sm text-brand-green">
        {{ peerText() }}
      </p>
    </div>
  `,
})
export class PortfolioStatsComponent {
  readonly stats = input.required<CumulativeStats>();
  readonly peer = input.required<PeerComparison>();

  tiles(): StatTile[] {
    return statTiles(this.stats());
  }

  peerText(): string {
    return peerComparisonText(this.peer());
  }
}
