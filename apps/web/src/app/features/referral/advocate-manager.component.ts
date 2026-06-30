import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdvocateDashboardView } from '../../core/models';
import { rewardTierLabel } from './referral-stats-format';
import { AdvocateLeaderboardComponent } from './advocate-leaderboard.component';

/**
 * Advocate manager (E15): the student-side panel to invite advocates (name + optional
 * email, up to 15), see each advocate's referral count + reward tier, and view the
 * advocate leaderboard. The created share link is shown once via the parent.
 */
@Component({
  selector: 'app-advocate-manager',
  standalone: true,
  imports: [FormsModule, AdvocateLeaderboardComponent],
  template: `
    <div class="space-y-5">
      <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-display text-base font-semibold text-ink">Advocate team</h3>
          <span class="text-xs text-slate2" data-testid="remaining"
            >{{ view().remaining }} of 15 invites left</span
          >
        </div>

        @if (canInvite()) {
          <form class="mt-4 flex flex-wrap items-end gap-2" (ngSubmit)="submit()">
            <label class="flex-1">
              <span class="text-xs text-slate2">Name</span>
              <input
                [(ngModel)]="name"
                name="name"
                required
                class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label class="flex-1">
              <span class="text-xs text-slate2">Email (optional)</span>
              <input
                [(ngModel)]="email"
                name="email"
                class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              [disabled]="!name().trim()"
              class="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Invite
            </button>
          </form>
        } @else {
          <p class="mt-4 text-sm text-slate2">
            You’ve reached the 15-advocate limit for this campaign.
          </p>
        }

        @if (view().advocates.length > 0) {
          <ul class="mt-4 space-y-2">
            @for (adv of view().advocates; track adv.id) {
              <li class="flex items-center justify-between rounded-xl bg-mist px-3 py-2 text-sm">
                <span class="text-ink">{{ adv.name }}</span>
                <span class="flex items-center gap-3">
                  <span class="text-slate2"
                    >{{ adv.referralCount }} referral{{ adv.referralCount === 1 ? '' : 's' }}</span
                  >
                  <span class="font-semibold text-brand-green">{{ tier(adv.reward) }}</span>
                </span>
              </li>
            }
          </ul>
        }
      </div>

      <app-advocate-leaderboard [entries]="view().leaderboard" />
    </div>
  `,
})
export class AdvocateManagerComponent {
  readonly view = input.required<AdvocateDashboardView>();
  readonly invite = output<{ name: string; email?: string }>();

  readonly name = signal('');
  readonly email = signal('');

  readonly canInvite = computed(() => this.view().remaining > 0);

  tier(reward: AdvocateDashboardView['advocates'][number]['reward']): string {
    return rewardTierLabel(reward);
  }

  submit(): void {
    const name = this.name().trim();
    if (!name) return;
    const email = this.email().trim();
    this.invite.emit(email ? { name, email } : { name });
    this.name.set('');
    this.email.set('');
  }
}
