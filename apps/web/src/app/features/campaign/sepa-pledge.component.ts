import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { DonationResult, Receipt } from '../../core/models';

@Component({
  selector: 'app-sepa-pledge',
  standalone: true,
  imports: [FormsModule, MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-center gap-2">
        <span
          class="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue"
          >Corporate</span
        >
        <h3 class="font-display text-lg font-semibold text-ink">Pledge via SEPA</h3>
      </div>
      <p class="mt-1 text-sm text-slate2">
        Commit a corporate gift and receive a receipt for your records.
      </p>

      @if (receipt(); as r) {
        <div class="mt-4 space-y-2 rounded-xl bg-mist p-4 text-sm">
          <p class="font-display text-base font-semibold text-ink">Pledge confirmed</p>
          <div class="flex justify-between">
            <span class="text-slate2">Receipt no.</span>
            <span class="font-medium text-ink">{{ r.receiptNo }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate2">Amount</span>
            <span class="font-medium text-ink">{{ r.amountCents | money: true }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate2">School</span>
            <span class="text-right font-medium text-ink">{{ r.school }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate2">Issued by</span>
            <span class="text-right font-medium text-ink">{{ r.issuer }}</span>
          </div>
          <button
            type="button"
            (click)="reset()"
            class="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-white"
          >
            Make another pledge
          </button>
        </div>
      } @else {
        <form class="mt-4 space-y-4" (ngSubmit)="submit()">
          <div>
            <label for="sepa-amount" class="mb-1.5 block text-sm font-medium text-ink"
              >Amount (€)</label
            >
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate2"
                >€</span
              >
              <input
                id="sepa-amount"
                name="sepaAmount"
                type="number"
                min="1"
                step="1"
                inputmode="decimal"
                [(ngModel)]="amountEur"
                class="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-ink focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div>
            <label for="sepa-message" class="mb-1.5 block text-sm font-medium text-ink"
              >Message (optional)</label
            >
            <textarea
              id="sepa-message"
              name="sepaMessage"
              rows="2"
              [(ngModel)]="message"
              placeholder="On behalf of your company"
              class="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            ></textarea>
          </div>

          @if (errorMsg()) {
            <p class="rounded-lg bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange">
              {{ errorMsg() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="!canSubmit"
            class="w-full rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            @if (submitting()) {
              Submitting…
            } @else {
              Pledge {{ amountCents | money: true }}
            }
          </button>
        </form>
      }
    </div>
  `,
})
export class SepaPledgeComponent {
  private readonly api = inject(ApiService);

  @Input({ required: true }) campaignId!: string;
  @Output() pledged = new EventEmitter<DonationResult>();

  amountEur: number | null = null;
  message = '';

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly receipt = signal<Receipt | null>(null);

  get amountCents(): number {
    return Math.round((this.amountEur ?? 0) * 100);
  }

  get canSubmit(): boolean {
    return this.amountCents > 0 && !this.submitting();
  }

  submit(): void {
    if (!this.canSubmit) return;

    this.errorMsg.set(null);
    this.submitting.set(true);

    const message = this.message.trim();

    this.api
      .donateSepa(this.campaignId, {
        amountCents: this.amountCents,
        message: message || undefined,
      })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.receipt.set(result.receipt ?? null);
          this.pledged.emit(result);
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.error?.message ?? 'Something went wrong');
          this.submitting.set(false);
        },
      });
  }

  reset(): void {
    this.receipt.set(null);
    this.errorMsg.set(null);
    this.amountEur = null;
    this.message = '';
  }
}
