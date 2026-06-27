import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/analytics.service';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { donateStartEvent, donateSuccessEvent } from '../../core/funnel-events';
import { MoneyPipe } from '../../core/money.pipe';
import { DonationResult, PublicDonation, TributeType } from '../../core/models';
import { tributeLine } from '../donor/tribute-display';

/** Emitted when a card donation succeeds: the server result plus an optimistic donor row. */
export interface DonationSuccess {
  result: DonationResult;
  optimistic: PublicDonation;
}

@Component({
  selector: 'app-donate-card',
  standalone: true,
  imports: [FormsModule, MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      @if (success()) {
        <div class="flex flex-col items-center gap-3 py-4 text-center">
          <div
            class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"
          >
            <svg class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <h3 class="font-display text-xl font-semibold text-ink">Thank you!</h3>
          @if (startedMonthly()) {
            <p class="text-sm text-slate2">
              Your monthly gift of
              <span class="font-semibold text-ink">{{ lastAmountCents() | money: true }}</span> is
              set up. Manage it any time from your account.
            </p>
          } @else {
            <p class="text-sm text-slate2">
              Your gift of
              <span class="font-semibold text-ink">{{ lastAmountCents() | money: true }}</span> is on
              its way to the school.
            </p>
          }
          <button
            type="button"
            (click)="reset()"
            class="mt-1 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
          >
            Make another donation
          </button>
        </div>
      } @else {
        <h3 class="font-display text-lg font-semibold text-ink">Make a donation</h3>
        <p class="mt-1 text-sm text-slate2">Every euro goes towards tuition.</p>

        <form class="mt-4 space-y-4" (ngSubmit)="submit()">
          <div>
            <span class="mb-1.5 block text-sm font-medium text-ink">Amount</span>
            <div class="flex gap-2">
              @for (preset of presets; track preset) {
                <button
                  type="button"
                  (click)="selectPreset(preset)"
                  class="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-mist"
                  [class.border-brand-green]="isActive(preset)"
                  [class.bg-brand-green]="isActive(preset)"
                  [class.text-white]="isActive(preset)"
                  [class.border-slate-200]="!isActive(preset)"
                >
                  €{{ preset }}
                </button>
              }
            </div>
          </div>

          <div>
            <label for="donate-amount" class="mb-1.5 block text-sm font-medium text-ink"
              >Custom amount (€)</label
            >
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate2"
                >€</span
              >
              <input
                id="donate-amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                inputmode="decimal"
                [(ngModel)]="amountEur"
                class="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>
          </div>

          <div>
            <label for="donate-tip" class="mb-1.5 block text-sm font-medium text-ink">
              Tip to support Bursa (optional)
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate2"
                >€</span
              >
              <input
                id="donate-tip"
                name="tip"
                type="number"
                min="0"
                step="1"
                inputmode="decimal"
                [(ngModel)]="tipEur"
                placeholder="0"
                class="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>
          </div>

          <div>
            <label for="donate-name" class="mb-1.5 block text-sm font-medium text-ink"
              >Your name (optional)</label
            >
            <input
              id="donate-name"
              name="donorName"
              type="text"
              [(ngModel)]="donorName"
              [disabled]="anonymous"
              placeholder="Shown next to your donation"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:bg-mist disabled:text-slate2"
            />
          </div>

          <div>
            <label for="donate-message" class="mb-1.5 block text-sm font-medium text-ink"
              >Message (optional)</label
            >
            <textarea
              id="donate-message"
              name="message"
              rows="2"
              [(ngModel)]="message"
              placeholder="Say something encouraging"
              class="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            ></textarea>
          </div>

          <label class="flex items-center gap-2 text-sm text-ink">
            <input
              name="anonymous"
              type="checkbox"
              [(ngModel)]="anonymous"
              class="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
            />
            Donate anonymously
          </label>

          <div>
            <label for="donate-tribute" class="mb-1.5 block text-sm font-medium text-ink">
              Dedicate this gift (optional)
            </label>
            <select
              id="donate-tribute"
              name="tributeType"
              [(ngModel)]="tributeType"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            >
              <option value="">No dedication</option>
              <option value="HONOR">In honour of…</option>
              <option value="MEMORY">In memory of…</option>
            </select>
            @if (tributeType) {
              <input
                name="tributeName"
                type="text"
                [(ngModel)]="tributeName"
                placeholder="Name of the person"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
              @if (tributePreview()) {
                <p class="mt-1 text-xs italic text-slate2">{{ tributePreview() }}</p>
              }
            }
          </div>

          @if (isDonor()) {
            <label class="flex items-center gap-2 text-sm text-ink">
              <input
                name="monthly"
                type="checkbox"
                [(ngModel)]="monthly"
                class="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
              />
              Make this a monthly gift (Sponsor a Student)
            </label>
          }

          @if (errorMsg()) {
            <p class="rounded-lg bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange">
              {{ errorMsg() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="!canSubmit"
            class="w-full rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            @if (submitting()) {
              Processing…
            } @else if (monthly && isDonor()) {
              Start monthly gift of {{ amountCents | money: true }}
            } @else {
              Donate {{ amountCents | money: true }}
            }
          </button>
        </form>
      }
    </div>
  `,
})
export class DonateCardComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);

  @Input({ required: true }) campaignId!: string;
  @Output() donated = new EventEmitter<DonationSuccess>();

  readonly presets = [25, 50, 100];

  amountEur: number | null = 50;
  tipEur: number | null = null;
  donorName = '';
  message = '';
  anonymous = false;
  tributeType: '' | TributeType = '';
  tributeName = '';
  monthly = false;

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly success = signal(false);
  readonly startedMonthly = signal(false);
  readonly lastAmountCents = signal(0);

  isDonor(): boolean {
    return this.auth.role() === 'DONOR';
  }

  tributePreview(): string | null {
    return tributeLine(this.tributeType || null, this.tributeName);
  }

  selectPreset(value: number): void {
    this.amountEur = value;
  }

  isActive(value: number): boolean {
    return this.amountEur === value;
  }

  get amountCents(): number {
    return Math.round((this.amountEur ?? 0) * 100);
  }

  get tipCents(): number {
    return Math.round((this.tipEur ?? 0) * 100);
  }

  get canSubmit(): boolean {
    return this.amountCents > 0 && !this.submitting();
  }

  submit(): void {
    if (!this.canSubmit) return;

    this.errorMsg.set(null);
    this.submitting.set(true);
    this.analytics.track(donateStartEvent(this.campaignId));

    const amountCents = this.amountCents;

    if (this.monthly && this.isDonor()) {
      this.startMonthly(amountCents);
      return;
    }

    const tipCents = this.tipCents;
    const donorName = this.donorName.trim();
    const message = this.message.trim();
    const anonymous = this.anonymous;
    const tribute = this.tributePreview()
      ? {
          tributeType: this.tributeType as TributeType,
          tributeName: this.tributeName.trim(),
        }
      : {};

    this.api
      .donateCard(this.campaignId, {
        amountCents,
        tipCents: tipCents > 0 ? tipCents : undefined,
        message: message || undefined,
        anonymous,
        donorName: donorName || undefined,
        ...tribute,
      })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.lastAmountCents.set(amountCents);
          this.success.set(true);
          this.analytics.track(donateSuccessEvent(this.campaignId));

          const optimistic: PublicDonation = {
            id: result.donation.id,
            donorName: anonymous ? 'Anonymous' : donorName || 'A kind supporter',
            amountCents,
            message: message || null,
            type: 'PRIVATE',
            createdAt: new Date().toISOString(),
          };
          this.donated.emit({ result, optimistic });
        },
        error: (err) => {
          const apiErr = err?.error?.error;
          let msg = apiErr?.message ?? 'Something went wrong';
          if (apiErr?.code === 'PAYMENT_FAILED') {
            msg +=
              ' — in this prototype, amounts ending in .13 always fail. Try a different amount.';
          }
          this.errorMsg.set(msg);
          this.submitting.set(false);
        },
      });
  }

  private startMonthly(amountCents: number): void {
    this.api.createRecurring({ campaignId: this.campaignId, amountCents }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.lastAmountCents.set(amountCents);
        this.startedMonthly.set(true);
        this.success.set(true);
      },
      error: (err) => {
        this.errorMsg.set(
          err?.error?.error?.message ?? 'Could not set up monthly giving',
        );
        this.submitting.set(false);
      },
    });
  }

  reset(): void {
    this.success.set(false);
    this.startedMonthly.set(false);
    this.errorMsg.set(null);
    this.amountEur = 50;
    this.tipEur = null;
    this.donorName = '';
    this.message = '';
    this.anonymous = false;
    this.tributeType = '';
    this.tributeName = '';
    this.monthly = false;
  }
}

