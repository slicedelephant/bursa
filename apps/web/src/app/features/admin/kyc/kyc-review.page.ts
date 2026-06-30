import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { KycDashboardView, VerificationCaseView } from '../../../core/models';
import { KycReviewDecisionEvent, KycReviewQueueComponent } from './kyc-review-queue.component';

/**
 * KYC manual-review operator console (ADMIN). Loads the pending review queue and
 * an aggregate dashboard, and performs operator decisions (approve / reject)
 * which reload the queue. Read-and-act only — it never touches the money path.
 */
@Component({
  selector: 'app-kyc-review',
  standalone: true,
  imports: [RouterLink, KycReviewQueueComponent],
  template: `
    <section class="mx-auto max-w-5xl px-4 py-10">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-semibold text-ink">KYC Review</h1>
          <p class="mt-1 text-sm text-slate2">
            Verification exceptions: failed liveness, document mismatch, AML hits.
          </p>
        </div>
        <a
          routerLink="/admin"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          Back to admin
        </a>
      </header>

      @if (dashboard(); as d) {
        <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
            <p class="text-xs text-slate2">Total cases</p>
            <p class="font-display text-2xl font-semibold text-ink">{{ d.total }}</p>
          </div>
          <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
            <p class="text-xs text-slate2">Pending review</p>
            <p class="font-display text-2xl font-semibold text-brand-orange">
              {{ d.pendingReview }}
            </p>
          </div>
          <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
            <p class="text-xs text-slate2">High risk</p>
            <p class="font-display text-2xl font-semibold text-ink">
              {{ d.riskDistribution.HIGH + d.riskDistribution.CRITICAL }}
            </p>
          </div>
          <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
            <p class="text-xs text-slate2">Verified</p>
            <p class="font-display text-2xl font-semibold text-brand-green">
              {{ d.byStatus['VERIFIED'] || 0 }}
            </p>
          </div>
        </div>
      }

      @if (error()) {
        <p class="mb-4 text-sm text-brand-orange">{{ error() }}</p>
      }

      <app-kyc-review-queue [cases]="queue()" (decided)="decide($event)" />
    </section>
  `,
})
export class KycReviewPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly queue = signal<VerificationCaseView[]>([]);
  readonly dashboard = signal<KycDashboardView | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.api.kycReviewQueue('PENDING').subscribe({
      next: (cases) => this.queue.set(cases),
      error: () => this.error.set('Could not load the review queue.'),
    });
    this.api.kycReviewDashboard().subscribe({
      next: (d) => this.dashboard.set(d),
      error: () => undefined,
    });
  }

  decide(event: KycReviewDecisionEvent): void {
    this.api.kycReviewDecide(event.id, { decision: event.decision, note: event.note }).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not record the decision.'),
    });
  }
}
