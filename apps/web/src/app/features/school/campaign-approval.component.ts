import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { SchoolCampaignForApproval } from '../../core/models';
import { formatEur } from './school-dashboard-format';

/** Campaign approval queue: review and approve/reject student campaigns. */
@Component({
  selector: 'app-school-campaign-approval',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <header class="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 class="font-display text-lg font-semibold text-ink">Campaigns awaiting approval</h3>
          <p class="text-sm text-slate2">Approve a campaign to publish it. Approval requires an active portal.</p>
        </div>
        <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-mist" (click)="load()">
          Refresh
        </button>
      </header>

      @if (error()) {
        <p class="mb-3 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange" role="alert">{{ error() }}</p>
      }
      @if (campaigns().length === 0) {
        <p class="text-sm text-slate2">Nothing in the queue. New submissions will appear here.</p>
      }

      <ul class="divide-y divide-slate-100">
        @for (c of campaigns(); track c.id) {
          <li class="py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-ink">{{ c.title }}</p>
                <p class="truncate text-xs text-slate2">
                  {{ c.studentProfile?.fullName }} · {{ c.programName }} · {{ eur(c.goalCents) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  [disabled]="busyId() === c.id"
                  (click)="approve(c)"
                >
                  Approve & publish
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-mist disabled:opacity-50"
                  [disabled]="busyId() === c.id"
                  (click)="rejectingId.set(c.id)"
                >
                  Reject
                </button>
              </div>
            </div>
            @if (rejectingId() === c.id) {
              <div class="mt-2 flex items-center gap-2">
                <input [(ngModel)]="rejectNote" class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Reason (required)" />
                <button type="button" class="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white" (click)="reject(c)">Confirm</button>
                <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs" (click)="cancelReject()">Cancel</button>
              </div>
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class SchoolCampaignApprovalComponent {
  private readonly api = inject(ApiService);

  readonly campaigns = signal<SchoolCampaignForApproval[]>([]);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly rejectingId = signal<string | null>(null);
  readonly rejectNote = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.api.schoolCampaigns().subscribe({
      next: (rows) => this.campaigns.set(rows),
      error: () => this.error.set('Could not load the approval queue.'),
    });
  }

  approve(c: SchoolCampaignForApproval): void {
    this.busyId.set(c.id);
    this.error.set(null);
    this.api.schoolApproveCampaign(c.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (err) => {
        this.error.set(this.message(err));
        this.busyId.set(null);
      },
    });
  }

  reject(c: SchoolCampaignForApproval): void {
    const note = this.rejectNote().trim();
    if (!note) return;
    this.busyId.set(c.id);
    this.api.schoolRejectCampaign(c.id, note).subscribe({
      next: () => {
        this.busyId.set(null);
        this.cancelReject();
        this.load();
      },
      error: (err) => {
        this.error.set(this.message(err));
        this.busyId.set(null);
      },
    });
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectNote.set('');
  }

  eur(cents: number): string {
    return formatEur(cents);
  }

  private message(err: { error?: { error?: { message?: string } } }): string {
    return err?.error?.error?.message ?? 'Something went wrong';
  }
}
