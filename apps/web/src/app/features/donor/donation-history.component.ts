import { Component, input, output } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { DonorDonation } from '../../core/models';
import { relativeTime } from '../campaign/relative-time';

/** Presentational donation history list. Emits a donation id to fetch its receipt. */
@Component({
  selector: 'app-donation-history',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Your donations</h2>

      @if (donations().length === 0) {
        <p class="mt-4 text-sm text-slate2">
          You haven't donated yet. When you support a student, your gifts and receipts appear here.
        </p>
      } @else {
        <ul class="mt-4 divide-y divide-slate-100">
          @for (d of donations(); track d.id) {
            <li class="flex flex-wrap items-start justify-between gap-3 py-3">
              <div class="min-w-0">
                <p class="font-medium text-ink">{{ d.campaignTitle }}</p>
                <p class="text-xs text-slate2">{{ d.schoolName }} · {{ when(d) }}</p>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  @if (d.recurring) {
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate2"
                      >Monthly</span
                    >
                  }
                  @if (d.tribute) {
                    <span
                      class="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue"
                      >{{ d.tribute }}</span
                    >
                  }
                  @if (d.anonymous) {
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate2"
                      >Anonymous</span
                    >
                  }
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate2">{{
                    d.status
                  }}</span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="font-semibold text-ink">{{ d.amountCents | money: true }}</span>
                @if (canReceipt(d)) {
                  <button
                    type="button"
                    (click)="receipt.emit(d.id)"
                    class="text-xs font-medium text-brand-green hover:underline"
                  >
                    View receipt
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class DonationHistoryComponent {
  readonly donations = input.required<DonorDonation[]>();
  readonly receipt = output<string>();

  when(d: DonorDonation): string {
    return relativeTime(d.createdAt);
  }

  canReceipt(d: DonorDonation): boolean {
    return d.status === 'CAPTURED' || d.status === 'SUCCEEDED';
  }
}
