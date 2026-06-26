import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { CampaignStatus, OwnerCampaign } from '../../core/models';
import { ProgressBarComponent } from '../../shared/progress-bar.component';

/** Step 3: shows the campaign status and the next action for the student. */
@Component({
  selector: 'app-student-campaign-status',
  standalone: true,
  imports: [RouterLink, MoneyPipe, ProgressBarComponent],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="font-display text-2xl font-bold text-ink">{{ campaign().title }}</h2>
          <p class="mt-1 text-sm text-slate2">
            {{ campaign().programName }}
            @if (campaign().school; as school) {
              · {{ school.name }} · {{ school.country }}
            }
          </p>
        </div>
        <span
          class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          [class]="badgeClass(campaign().status)"
        >
          {{ statusLabel[campaign().status] }}
        </span>
      </div>

      <div class="mt-6 space-y-2">
        <app-progress-bar [percent]="percent()" />
        <div class="flex items-baseline justify-between text-sm">
          <span class="font-semibold text-ink">{{ campaign().raisedCents | money }} raised</span>
          <span class="text-slate2">of {{ campaign().goalCents | money }}</span>
        </div>
      </div>

      @switch (campaign().status) {
        @case ('DRAFT') {
          <div class="mt-6 rounded-lg bg-mist p-4">
            <p class="text-sm text-slate2">
              Your campaign is still a draft. Submit it for verification — an admin will verify your
              admission with your school before the campaign goes live.
            </p>
            @if (error()) {
              <p class="mt-3 text-sm font-medium text-brand-orange" role="alert">{{ error() }}</p>
            }
            <button
              type="button"
              (click)="submit()"
              [disabled]="submitting()"
              class="mt-3 rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              @if (submitting()) {
                Submitting…
              } @else {
                Submit for verification
              }
            </button>
          </div>
        }
        @case ('PENDING_VERIFICATION') {
          <div class="mt-6 rounded-lg bg-brand-blue/10 p-4">
            <p class="text-sm font-medium text-ink">Awaiting admission verification</p>
            <p class="mt-1 text-sm text-slate2">
              An admin is reviewing your admission. We'll let you know as soon as your campaign is
              live.
            </p>
          </div>
        }
        @case ('REJECTED') {
          <div class="mt-6 rounded-lg bg-brand-orange/10 p-4">
            <p class="text-sm font-semibold text-brand-orange">Verification rejected</p>
            <p class="mt-1 text-sm text-ink">
              {{ campaign().verification?.note || 'Please review your details and contact support for the next steps.' }}
            </p>
          </div>
        }
        @default {
          <a
            [routerLink]="['/campaigns', campaign().id]"
            class="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            View your public campaign →
          </a>
        }
      }
    </div>
  `,
})
export class StudentCampaignStatus {
  private readonly api = inject(ApiService);

  readonly campaign = input.required<OwnerCampaign>();

  /** Emitted after a status change (e.g. submitted) so the parent can reload. */
  readonly changed = output<void>();

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly statusLabel: Record<CampaignStatus, string> = {
    DRAFT: 'Draft',
    PENDING_VERIFICATION: 'Pending verification',
    LIVE: 'Live',
    FUNDED: 'Funded',
    DISBURSED: 'Disbursed',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
  };

  readonly percent = computed(() => {
    const c = this.campaign();
    return c.goalCents > 0 ? Math.round((c.raisedCents / c.goalCents) * 100) : 0;
  });

  badgeClass(status: CampaignStatus): string {
    switch (status) {
      case 'LIVE':
      case 'FUNDED':
      case 'DISBURSED':
        return 'bg-brand-green/10 text-brand-green';
      case 'PENDING_VERIFICATION':
        return 'bg-brand-blue/10 text-brand-blue';
      case 'REJECTED':
        return 'bg-brand-orange/10 text-brand-orange';
      default:
        return 'bg-slate-100 text-slate2';
    }
  }

  submit(): void {
    if (this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    this.api.submitCampaign(this.campaign().id, {}).subscribe({
      next: () => {
        this.submitting.set(false);
        this.changed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
      },
    });
  }
}
