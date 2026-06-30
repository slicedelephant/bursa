import { Component, input } from '@angular/core';
import { BadgeProgress, StreakState } from '../../core/models';
import { badgeColorClass, badgeLabel, nextMilestoneText, streakText } from './streak-format';

/** Presentational giving-streak banner: streak text, badge pill and next milestone. */
@Component({
  selector: 'app-streak-banner',
  standalone: true,
  template: `
    <div
      class="rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-blue/10 p-5 shadow-card ring-1 ring-black/5"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-slate2">Your giving streak</p>
          <p class="mt-1 font-display text-2xl font-bold text-ink">{{ streakLabel() }}</p>
          <p class="mt-1 text-xs text-slate2">{{ milestone() }}</p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
          [class]="badgeClass()"
        >
          {{ tierLabel() }}
        </span>
      </div>
    </div>
  `,
})
export class StreakBannerComponent {
  readonly streak = input.required<StreakState>();
  readonly badge = input.required<BadgeProgress>();

  streakLabel(): string {
    return streakText(this.streak());
  }

  tierLabel(): string {
    return badgeLabel(this.badge());
  }

  badgeClass(): string {
    return badgeColorClass(this.badge());
  }

  milestone(): string {
    return nextMilestoneText(this.badge());
  }
}
