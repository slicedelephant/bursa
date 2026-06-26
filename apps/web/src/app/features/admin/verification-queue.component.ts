import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { OwnerCampaign } from '../../core/models';

/** Section A: pending campaigns awaiting admin verification + publish. */
@Component({
  selector: 'app-admin-verification-queue',
  standalone: true,
  imports: [FormsModule, RouterLink, MoneyPipe],
  template: `
    <div class="space-y-4">
      <header class="flex items-end justify-between gap-4">
        <div>
          <h2 class="font-display text-xl font-semibold text-ink">Verification queue</h2>
          <p class="text-sm text-slate2">
            Review submitted campaigns. Verifying publishes the campaign and takes it LIVE.
          </p>
        </div>
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist" (click)="load()">
          Refresh
        </button>
      </header>

      @if (error()) {
        <div class="rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange ring-1 ring-brand-orange/20">
          {{ error() }}
        </div>
      }

      @if (loading()) {
        <p class="text-sm text-slate2">Loading queue…</p>
      } @else if (items().length === 0) {
        <div class="rounded-2xl bg-white p-6 text-sm text-slate2 shadow-card ring-1 ring-black/5">
          Nothing pending. The queue is clear.
        </div>
      } @else {
        <ul class="space-y-4">
          @for (c of items(); track c.id) {
            <li class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0 space-y-1">
                  <a
                    [routerLink]="['/campaigns', c.id]"
                    class="font-display text-lg font-semibold text-ink hover:text-brand-green"
                  >
                    {{ c.title }}
                  </a>
                  <p class="text-sm text-slate2">
                    {{ c.studentProfile?.fullName ?? 'Unknown student' }} ·
                    {{ c.programName }}
                  </p>
                  <p class="text-sm text-slate2">
                    {{ c.school?.name ?? 'School pending' }}
                    @if (c.school?.country) {
                      · {{ c.school?.country }}
                    }
                    @if (c.school && !c.school.payoutVerified) {
                      <span
                        class="ml-1 inline-flex items-center rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-semibold text-brand-orange"
                      >
                        Payout not verified
                      </span>
                    }
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs uppercase tracking-wide text-slate2">Goal</p>
                  <p class="font-display text-lg font-semibold text-ink">{{ c.goalCents | money }}</p>
                </div>
              </div>

              @if (c.verification?.note) {
                <p class="mt-3 rounded-lg bg-mist px-3 py-2 text-sm text-slate2">
                  <span class="font-semibold text-ink">Note:</span> {{ c.verification?.note }}
                </p>
              }

              @if (gateId() === c.id) {
                <p class="mt-3 rounded-lg bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange ring-1 ring-brand-orange/20">
                  This school’s payout account is not verified yet. Verify it under the
                  <span class="font-semibold">Schools</span> tab before publishing this campaign.
                </p>
              }

              @if (rejectingId() === c.id) {
                <div class="mt-4 space-y-2">
                  <label class="block text-sm font-medium text-ink" [attr.for]="'reject-' + c.id">
                    Reason for rejection
                  </label>
                  <textarea
                    [id]="'reject-' + c.id"
                    rows="3"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    placeholder="Explain what the student needs to fix…"
                    [ngModel]="rejectNote()"
                    (ngModelChange)="rejectNote.set($event)"
                  ></textarea>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="rounded-lg bg-brand-orange px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      [disabled]="busyId() === c.id || rejectNote().trim().length === 0"
                      (click)="confirmReject(c)"
                    >
                      {{ busyId() === c.id ? 'Rejecting…' : 'Confirm rejection' }}
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist disabled:opacity-50"
                      [disabled]="busyId() === c.id"
                      (click)="cancelReject()"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              } @else {
                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    [disabled]="busyId() === c.id"
                    (click)="verify(c)"
                  >
                    {{ busyId() === c.id ? 'Publishing…' : 'Verify & publish' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist disabled:opacity-50"
                    [disabled]="busyId() === c.id"
                    (click)="startReject(c)"
                  >
                    Reject
                  </button>
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class AdminVerificationQueueComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly items = signal<OwnerCampaign[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly rejectingId = signal<string | null>(null);
  readonly rejectNote = signal('');
  readonly gateId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.verifications('PENDING').subscribe({
      next: (v) => {
        this.items.set(v);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.loading.set(false);
      },
    });
  }

  verify(c: OwnerCampaign): void {
    this.busyId.set(c.id);
    this.error.set(null);
    this.gateId.set(null);
    this.api.verifyCampaign(c.id, {}).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        if (code === 'SCHOOL_NOT_VERIFIED') {
          this.gateId.set(c.id);
        }
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.busyId.set(null);
      },
    });
  }

  startReject(c: OwnerCampaign): void {
    this.gateId.set(null);
    this.rejectingId.set(c.id);
    this.rejectNote.set('');
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectNote.set('');
  }

  confirmReject(c: OwnerCampaign): void {
    const note = this.rejectNote().trim();
    if (!note) return;
    this.busyId.set(c.id);
    this.error.set(null);
    this.api.rejectCampaign(c.id, { note }).subscribe({
      next: () => {
        this.busyId.set(null);
        this.rejectingId.set(null);
        this.rejectNote.set('');
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.busyId.set(null);
      },
    });
  }
}
