import { Component, input, output } from '@angular/core';
import { GroupVoteView } from '../../core/models';
import { optionPercent, voteStatusText, winnerLabel } from './voting-format';

/** Presentational group voting: the question, each option with its vote share,
 * and a vote button per option. Emits the chosen option id for the parent to
 * persist. Read-only when the vote is closed or the viewer cannot vote. */
@Component({
  selector: 'app-group-voting',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-start justify-between gap-3">
        <h3 class="font-display text-lg font-semibold text-ink">{{ view().question }}</h3>
        <span class="shrink-0 rounded-full bg-mist px-3 py-1 text-xs font-medium text-slate2">
          {{ statusText() }}
        </span>
      </div>

      <ul class="mt-4 space-y-3">
        @for (option of view().options; track option.id) {
          <li>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink">{{ option.label }}</span>
              <span class="text-slate2">{{ option.count }} · {{ percent(option) }}%</span>
            </div>
            <div class="mt-1 flex items-center gap-2">
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                <div
                  class="h-full rounded-full bg-brand-blue"
                  [style.width.%]="percent(option)"
                ></div>
              </div>
              @if (canVote()) {
                <button
                  type="button"
                  (click)="vote.emit(option.id)"
                  class="shrink-0 rounded-full bg-brand-green px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                >
                  Vote
                </button>
              }
            </div>
          </li>
        }
      </ul>

      <p class="mt-4 text-sm text-slate2">
        {{ view().totalVotes }} votes · leading: {{ winner() }}
      </p>
    </div>
  `,
})
export class GroupVotingComponent {
  readonly view = input.required<GroupVoteView>();
  /** Whether the current viewer may cast a ballot (open vote + contributor+). */
  readonly canVote = input<boolean>(false);
  readonly vote = output<string>();

  statusText(): string {
    return voteStatusText(this.view());
  }

  percent(option: GroupVoteView['options'][number]): number {
    return optionPercent(option, this.view().totalVotes);
  }

  winner(): string {
    return winnerLabel(this.view());
  }
}
