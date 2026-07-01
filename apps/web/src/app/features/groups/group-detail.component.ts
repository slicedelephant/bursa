import { Component, computed, input } from '@angular/core';
import { GroupDetailView } from '../../core/models';
import { euros, modeLabel, sharedGoalText, stretchText, visibilityLabel } from './group-format';
import { roleLabel } from './role-format';

/** Presentational group detail: shared progress bar, stretch-goal, members with
 * roles, leaderboard (E16 ranking) and the sub-campaigns (cohort) or portfolio
 * contributions (circle). One component serves both modes. */
@Component({
  selector: 'app-group-detail',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs uppercase tracking-wide text-brand-green">
            {{ mode() }} · {{ visibility() }}
          </p>
          <h2 class="font-display text-2xl font-semibold text-ink">{{ view().group.name }}</h2>
          @if (view().group.description) {
            <p class="mt-1 text-sm text-slate2">{{ view().group.description }}</p>
          }
        </div>
        <span class="shrink-0 rounded-full bg-mist px-3 py-1 text-xs font-medium text-slate2">
          {{ view().memberCount }} members
        </span>
      </div>

      <!-- Shared progress bar -->
      <div class="mt-6">
        <div class="flex items-baseline justify-between text-sm">
          <span class="font-semibold text-ink">€{{ raised() }} raised</span>
          <span class="text-slate2">{{ goalText() }}</span>
        </div>
        <div class="mt-2 h-3 overflow-hidden rounded-full bg-mist">
          <div
            class="h-full rounded-full bg-brand-green transition-all"
            [style.width.%]="view().sharedGoal.percent"
          ></div>
        </div>
        <p
          class="mt-2 text-sm font-medium"
          [class]="view().stretch.unlocked ? 'text-brand-green' : 'text-slate2'"
        >
          {{ stretch() }}
        </p>
      </div>

      <!-- Leaderboard -->
      <div class="mt-6">
        <h3 class="text-sm font-semibold text-ink">Leaderboard</h3>
        <ul class="mt-2 space-y-1">
          @for (entry of view().leaderboard; track entry.id) {
            <li class="flex items-center justify-between rounded-lg bg-mist/50 px-3 py-2 text-sm">
              <span class="text-ink">#{{ entry.rank }} {{ entry.label }}</span>
              <span class="font-medium text-slate2">€{{ score(entry.score) }}</span>
            </li>
          }
        </ul>
      </div>

      <!-- Members -->
      <div class="mt-6">
        <h3 class="text-sm font-semibold text-ink">Members</h3>
        <ul class="mt-2 space-y-1">
          @for (member of view().members; track member.userId) {
            <li class="flex items-center justify-between text-sm">
              <span class="text-ink">{{ member.name }}</span>
              <span class="text-xs font-medium text-slate2">{{ role(member.role) }}</span>
            </li>
          }
        </ul>
      </div>

      <!-- Sub-campaigns (cohort) or contributions (circle) -->
      <div class="mt-6">
        <h3 class="text-sm font-semibold text-ink">{{ partsHeading() }}</h3>
        <ul class="mt-2 space-y-1">
          @for (part of parts(); track part.campaignId) {
            <li class="flex items-center justify-between rounded-lg bg-mist/50 px-3 py-2 text-sm">
              <span class="truncate text-ink">{{ part.title }}</span>
              <span class="font-medium text-slate2">€{{ score(part.valueCents) }}</span>
            </li>
          } @empty {
            <li class="text-sm text-slate2">{{ emptyText() }}</li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class GroupDetailComponent {
  readonly view = input.required<GroupDetailView>();

  readonly isCohort = computed(() => this.view().group.mode === 'COHORT');

  mode(): string {
    return modeLabel(this.view().group.mode);
  }

  visibility(): string {
    return visibilityLabel(this.view().group.visibility);
  }

  raised(): string {
    return euros(this.view().sharedGoal.raisedCents);
  }

  goalText(): string {
    return sharedGoalText(this.view().sharedGoal);
  }

  stretch(): string {
    return stretchText(this.view().stretch);
  }

  score(cents: number): string {
    return euros(cents);
  }

  role(r: GroupDetailView['members'][number]['role']): string {
    return roleLabel(r);
  }

  parts() {
    return this.isCohort() ? (this.view().subCampaigns ?? []) : (this.view().contributions ?? []);
  }

  partsHeading(): string {
    return this.isCohort() ? 'Sub-campaigns' : 'Group portfolio';
  }

  emptyText(): string {
    return this.isCohort() ? 'No sub-campaigns linked yet.' : 'No contributions yet.';
  }
}
