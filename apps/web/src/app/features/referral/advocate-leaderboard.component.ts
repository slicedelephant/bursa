import { Component, input } from '@angular/core';
import { LeaderboardEntry } from '../../core/models';

/**
 * Advocate leaderboard (E15): the top advocates promoting a campaign, ranked by
 * referral count. Shown on the public campaign page and reused on the fundraiser
 * dashboard. Ranking comes from the reusable E16 leaderboard primitive (server-side).
 */
@Component({
  selector: 'app-advocate-leaderboard',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
      <h3 class="font-display text-base font-semibold text-ink">{{ heading() }}</h3>
      @if (entries().length === 0) {
        <p class="mt-3 text-sm text-slate2">{{ emptyText() }}</p>
      } @else {
        <ol class="mt-3 space-y-2">
          @for (entry of entries(); track entry.id) {
            <li class="flex items-center justify-between rounded-xl bg-mist px-3 py-2 text-sm">
              <span class="flex items-center gap-2 text-ink">
                <span class="font-display font-bold text-slate2">#{{ entry.rank }}</span>
                {{ entry.label }}
              </span>
              <span class="font-semibold text-brand-green"
                >{{ entry.score }} referral{{ entry.score === 1 ? '' : 's' }}</span
              >
            </li>
          }
        </ol>
      }
    </div>
  `,
})
export class AdvocateLeaderboardComponent {
  readonly entries = input.required<LeaderboardEntry[]>();
  readonly heading = input<string>('Top advocates');
  readonly emptyText = input<string>('No advocates yet — be the first to spread the word.');
}
