import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { PayoutProof } from '../../core/models';

/**
 * Public payout proof. For DISBURSED campaigns it shows the receipt (school,
 * amount, date, reference); otherwise it shows the direct-payout promise that a
 * verifiable receipt will appear here once the goal is reached.
 */
@Component({
  selector: 'app-payout-proof',
  standalone: true,
  imports: [MoneyPipe, DatePipe],
  template: `
    @if (proof; as p) {
      <div class="rounded-2xl bg-brand-green/5 p-6 shadow-card ring-1 ring-brand-green/20">
        <div class="flex items-center gap-2">
          <span
            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-white"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
          <h2 class="font-display text-lg font-semibold text-ink">Paid out to the school</h2>
        </div>

        <p class="mt-3 text-sm text-slate2">
          Bursa transferred the funds directly to
          <span class="font-semibold text-ink">{{ p.schoolName }}</span
          >.
        </p>

        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex items-baseline justify-between gap-2">
            <dt class="text-slate2">Amount</dt>
            <dd class="font-semibold text-ink">{{ p.amountCents | money: true }}</dd>
          </div>
          @if (p.sentAt) {
            <div class="flex items-baseline justify-between gap-2">
              <dt class="text-slate2">Date</dt>
              <dd class="font-medium text-ink">{{ p.sentAt | date: 'mediumDate' }}</dd>
            </div>
          }
          <div class="flex items-baseline justify-between gap-2">
            <dt class="text-slate2">Reference</dt>
            <dd class="font-mono text-xs font-medium text-ink">{{ p.reference }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <dt class="text-slate2">Status</dt>
            <dd class="font-medium text-brand-green">{{ p.status }}</dd>
          </div>
        </dl>
      </div>
    } @else {
      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h2 class="font-display text-lg font-semibold text-ink">Direct payout, on the record</h2>
        <p class="mt-2 text-sm text-slate2">
          When the goal is reached, Bursa transfers the funds directly to the school, never to the
          student. The signed payout reference is published right here, so anyone can verify it.
        </p>
      </div>
    }
  `,
})
export class PayoutProofComponent {
  @Input() proof: PayoutProof | null = null;
}
