import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { Receipt } from '../../core/models';

/** Modal panel that renders a single donation receipt's details. */
@Component({
  selector: 'app-receipt-panel',
  standalone: true,
  imports: [MoneyPipe, DatePipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      (click)="onBackdrop($event)"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Donation receipt"
        class="w-full max-w-md rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-green">
              Donation receipt
            </p>
            <h3 class="font-display text-xl font-semibold text-ink">{{ receipt.receiptNo }}</h3>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            aria-label="Close receipt"
            class="rounded-lg border border-slate-200 px-2.5 py-1 text-slate2 hover:bg-mist"
          >
            ✕
          </button>
        </div>

        <dl class="mt-5 space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-slate2">Date</dt>
            <dd class="font-medium text-ink">{{ receipt.date | date: 'mediumDate' }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-slate2">Donor</dt>
            <dd class="font-medium text-ink text-right">{{ receipt.donor }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-slate2">Amount</dt>
            <dd class="font-semibold text-brand-green">{{ receipt.amountCents | money: true }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-slate2">Campaign</dt>
            <dd class="font-medium text-ink text-right">{{ receipt.campaign }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-slate2">School</dt>
            <dd class="font-medium text-ink text-right">{{ receipt.school }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-slate2">Issuer</dt>
            <dd class="font-medium text-ink text-right">{{ receipt.issuer }}</dd>
          </div>
        </dl>

        <button
          type="button"
          (click)="close.emit()"
          class="mt-6 w-full rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist"
        >
          Close
        </button>
      </div>
    </div>
  `,
})
export class ReceiptPanelComponent {
  @Input({ required: true }) receipt!: Receipt;
  @Output() close = new EventEmitter<void>();

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }
}
