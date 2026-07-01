import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  GroupChatView,
  GroupDetailView,
  GroupListView,
  GroupMode,
  GroupVoteView,
} from '../../core/models';
import { GroupChatComponent } from './group-chat.component';
import { GroupDetailComponent } from './group-detail.component';
import { GroupVotingComponent } from './group-voting.component';
import { modeLabel } from './group-format';
import { canContribute } from './role-format';

/** Groups landing page: my groups + public groups, a create-group form (mode
 * choice), and — when a group is opened — its detail (shared progress, members,
 * leaderboard, sub-campaigns/portfolio), voting and moderated chat. */
@Component({
  selector: 'app-groups-page',
  standalone: true,
  imports: [FormsModule, GroupDetailComponent, GroupVotingComponent, GroupChatComponent],
  template: `
    <section class="mx-auto max-w-5xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">Fundraise together</p>
        <h1 class="font-display text-3xl font-semibold text-ink">Groups</h1>
        <p class="mt-1 text-sm text-slate2">
          Cohort teams and giving circles run on one engine — a shared goal, a leaderboard, votes
          and a moderated chat.
        </p>
      </header>

      @if (!selected()) {
        <!-- Create group -->
        <div class="mb-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <h2 class="font-display text-lg font-semibold text-ink">Start a group</h2>
          <form class="mt-4 grid gap-3 sm:grid-cols-2" (ngSubmit)="create()">
            <input
              [(ngModel)]="name"
              name="name"
              placeholder="Group name"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              [(ngModel)]="mode"
              name="mode"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="COHORT">{{ label('COHORT') }}</option>
              <option value="GIVING_CIRCLE">{{ label('GIVING_CIRCLE') }}</option>
            </select>
            <input
              [(ngModel)]="goalEuros"
              name="goal"
              type="number"
              min="0"
              placeholder="Shared goal (€)"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              class="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:col-span-2"
            >
              Create group
            </button>
          </form>
        </div>

        <!-- My groups -->
        <h2 class="font-display text-lg font-semibold text-ink">My groups</h2>
        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          @for (group of list()?.mine ?? []; track group.id) {
            <li>
              <button
                type="button"
                (click)="open(group.id)"
                class="w-full rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-black/5 hover:ring-brand-green/40"
              >
                <p class="text-xs uppercase tracking-wide text-brand-green">
                  {{ label(group.mode) }}
                </p>
                <p class="font-semibold text-ink">{{ group.name }}</p>
                <p class="text-xs text-slate2">{{ group.memberCount }} members</p>
              </button>
            </li>
          } @empty {
            <li class="text-sm text-slate2">You are not in any group yet.</li>
          }
        </ul>

        <!-- Public groups -->
        <h2 class="mt-8 font-display text-lg font-semibold text-ink">Public groups</h2>
        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          @for (group of list()?.public ?? []; track group.id) {
            <li>
              <button
                type="button"
                (click)="open(group.id)"
                class="w-full rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-black/5 hover:ring-brand-green/40"
              >
                <p class="text-xs uppercase tracking-wide text-brand-blue">
                  {{ label(group.mode) }}
                </p>
                <p class="font-semibold text-ink">{{ group.name }}</p>
                <p class="text-xs text-slate2">{{ group.memberCount }} members</p>
              </button>
            </li>
          } @empty {
            <li class="text-sm text-slate2">No public groups yet.</li>
          }
        </ul>
      } @else {
        <button
          type="button"
          (click)="back()"
          class="mb-4 text-sm font-medium text-brand-green hover:underline"
        >
          ← Back to groups
        </button>

        <div class="space-y-6">
          <app-group-detail [view]="selected()!" />

          @if (vote()) {
            <app-group-voting [view]="vote()!" [canVote]="canVote()" (vote)="castBallot($event)" />
          }

          <app-group-chat
            [view]="chat()"
            [canPost]="canPost()"
            [rejection]="chatRejection()"
            (post)="postMessage($event)"
          />
        </div>
      }
    </section>
  `,
})
export class GroupsPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly list = signal<GroupListView | null>(null);
  readonly selected = signal<GroupDetailView | null>(null);
  readonly vote = signal<GroupVoteView | null>(null);
  readonly chat = signal<GroupChatView>({ messages: [] });
  readonly chatRejection = signal('');

  name = '';
  mode: GroupMode = 'COHORT';
  goalEuros = 0;

  readonly canContrib = computed(() => canContribute(this.selected()?.role ?? null));

  ngOnInit(): void {
    this.reload();
  }

  label(mode: GroupMode): string {
    return modeLabel(mode);
  }

  canVote(): boolean {
    return this.canContrib() && this.vote()?.status === 'OPEN';
  }

  canPost(): boolean {
    return this.canContrib();
  }

  reload(): void {
    this.api.listGroups().subscribe((list) => this.list.set(list));
  }

  create(): void {
    if (this.name.trim().length === 0) return;
    this.api
      .createGroup({
        mode: this.mode,
        name: this.name.trim(),
        sharedGoalCents: Math.max(0, Math.round(this.goalEuros * 100)),
      })
      .subscribe((created) => {
        this.name = '';
        this.goalEuros = 0;
        this.open(created.id);
        this.reload();
      });
  }

  open(id: string): void {
    this.api.getGroup(id).subscribe((detail) => this.selected.set(detail));
    this.api.groupMessages(id).subscribe((chat) => this.chat.set(chat));
    this.vote.set(null);
  }

  back(): void {
    this.selected.set(null);
    this.vote.set(null);
    this.chatRejection.set('');
  }

  castBallot(optionId: string): void {
    const group = this.selected();
    const vote = this.vote();
    if (!group || !vote) return;
    this.api.castGroupBallot(group.group.id, vote.id, optionId).subscribe(() => {
      this.api.getGroupVote(group.group.id, vote.id).subscribe((v) => this.vote.set(v));
    });
  }

  postMessage(text: string): void {
    const group = this.selected();
    if (!group) return;
    this.chatRejection.set('');
    this.api.postGroupMessage(group.group.id, text).subscribe((result) => {
      if (result.status === 'REJECTED') {
        this.chatRejection.set(`Message blocked: ${result.reasons.join(', ')}`);
        return;
      }
      this.api.groupMessages(group.group.id).subscribe((chat) => this.chat.set(chat));
    });
  }
}
