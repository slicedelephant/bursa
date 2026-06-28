import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import {
  CorporateSponsorshipResult,
  SponsorBody,
  SponsorshipTier,
} from '../../core/models';
import { documentTypeLabel, invoiceStatusLabel } from './esg-format';
import { giftTiers, isFullTuition } from './gift-tiers';

/**
 * Dominant corporate full-tuition CTA on the campaign page (SPONSOR role).
 * Shows the exact remaining gap as a one-click "close the gap" option plus gift
 * tiers, recognition opt-ins (named scholarship, logo, impact report) and B2B
 * fields (VAT id, PO). CARD captures immediately; SEPA records a pledge with a
 * pending invoice. On success it shows the invoice/receipt.
 */
@Component({
  selector: 'app-corporate-sponsor-box',
  standalone: true,
  imports: [FormsModule, MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-center gap-2">
        <span class="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue"
          >Corporate</span
        >
        <h3 class="font-display text-lg font-semibold text-ink">Sponsor this scholarship</h3>
      </div>

      @if (result(); as r) {
        <div class="mt-4 space-y-2 rounded-xl bg-mist p-4 text-sm">
          <p class="font-display text-base font-semibold text-ink">
            {{ r.sponsorship.fullTuition ? 'Tuition fully funded' : 'Sponsorship recorded' }}
          </p>
          <div class="flex justify-between gap-4">
            <span class="text-slate2">Invoice</span>
            <span class="text-right font-medium text-ink">{{ r.invoice.invoiceNo }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate2">Document</span>
            <span class="text-right font-medium text-ink">{{ docLabel(r) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate2">Net</span>
            <span class="font-medium text-ink">{{ r.invoice.netCents | money: true }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate2">VAT</span>
            <span class="font-medium text-ink">{{ r.invoice.vatCents | money: true }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate2">Gross</span>
            <span class="font-semibold text-brand-green">{{ r.invoice.grossCents | money: true }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-slate2">Status</span>
            <span class="text-right font-medium text-ink">{{ statusLabel(r) }}</span>
          </div>
          <button
            type="button"
            (click)="reset()"
            class="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-white"
          >
            Make another sponsorship
          </button>
        </div>
      } @else {
        <!-- Full-tuition CTA -->
        @if (fullGap() > 0) {
          <button
            type="button"
            (click)="selectFull()"
            [class.ring-2]="tier() === 'FULL'"
            class="mt-4 w-full rounded-xl bg-brand-green/5 p-4 text-left ring-brand-green/40 hover:bg-brand-green/10"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-green">
              Close the gap · highest impact
            </p>
            <p class="mt-1 font-display text-2xl font-bold text-ink">{{ fullGap() | money }}</p>
            <p class="text-sm text-slate2">Fund the full remaining tuition in one gift.</p>
          </button>
        }

        <!-- Gift tiers -->
        <fieldset class="mt-4 space-y-2">
          <legend class="mb-1 text-sm font-medium text-ink">Or choose a gift tier</legend>
          @for (t of tiers(); track t.tier) {
            <label
              class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              <span class="flex items-center gap-2">
                <input type="radio" name="tier" [value]="t.tier" [(ngModel)]="tierModel" />
                <span class="text-sm text-ink">{{ t.label }}</span>
              </span>
              <span class="text-sm font-semibold text-ink">{{ t.amountCents | money }}</span>
            </label>
          }
          <label
            class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
          >
            <span class="flex items-center gap-2">
              <input type="radio" name="tier" value="CUSTOM" [(ngModel)]="tierModel" />
              <span class="text-sm text-ink">Custom</span>
            </span>
            @if (tier() === 'CUSTOM') {
              <span class="relative">
                <span class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate2"
                  >€</span
                >
                <input
                  type="number"
                  min="10"
                  [(ngModel)]="customEur"
                  name="customEur"
                  class="w-28 rounded-lg border border-slate-200 py-1 pl-6 pr-2 text-right text-ink"
                />
              </span>
            }
          </label>
        </fieldset>

        <!-- Recognition + B2B -->
        <div class="mt-4 space-y-3">
          <div>
            <label for="sch" class="mb-1 block text-sm font-medium text-ink"
              >Name the scholarship (optional)</label
            >
            <input
              id="sch"
              name="sch"
              type="text"
              [(ngModel)]="scholarshipName"
              placeholder="The {{ '{' }}Company{{ '}' }} Scholarship"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink"
            />
          </div>
          <label class="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" [(ngModel)]="logoRecognition" name="logo" />
            Show our logo (counts as sponsoring → invoice with VAT)
          </label>
          <label class="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" [(ngModel)]="impactReportOptIn" name="impact" />
            Send us quarterly impact reports
          </label>
          <div class="grid grid-cols-2 gap-2">
            <input
              name="vat"
              type="text"
              [(ngModel)]="vatId"
              placeholder="VAT ID"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink"
            />
            <input
              name="po"
              type="text"
              [(ngModel)]="poNumber"
              placeholder="PO number"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink"
            />
          </div>
          <div class="flex gap-2">
            <label class="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="method" value="CARD" [(ngModel)]="method" /> Card
            </label>
            <label class="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="method" value="SEPA" [(ngModel)]="method" /> SEPA
            </label>
          </div>
        </div>

        @if (errorMsg()) {
          <p class="mt-3 rounded-lg bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange">
            {{ errorMsg() }}
          </p>
        }

        <button
          type="button"
          (click)="submit()"
          [disabled]="!canSubmit()"
          class="mt-4 w-full rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          @if (submitting()) {
            Processing…
          } @else {
            Sponsor {{ amountCents() | money }}
          }
        </button>
        <p class="mt-2 text-center text-xs text-slate2">
          100% of the tuition goes directly to the school. Bursa holds no funds.
        </p>
      }
    </div>
  `,
})
export class CorporateSponsorBoxComponent {
  private readonly api = inject(ApiService);

  @Input({ required: true }) campaignId!: string;
  @Input() goalCents = 0;
  @Input() raisedCents = 0;
  @Output() sponsored = new EventEmitter<CorporateSponsorshipResult>();

  tierModel: SponsorshipTier = 'FULL';
  customEur: number | null = null;
  scholarshipName = '';
  logoRecognition = false;
  impactReportOptIn = false;
  vatId = '';
  poNumber = '';
  method: 'CARD' | 'SEPA' = 'CARD';

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly result = signal<CorporateSponsorshipResult | null>(null);

  tier(): SponsorshipTier {
    return this.tierModel;
  }

  tiers() {
    return giftTiers(this.goalCents, this.raisedCents);
  }

  fullGap(): number {
    return Math.max(0, this.goalCents - this.raisedCents);
  }

  customCents(): number {
    return Math.round((this.customEur ?? 0) * 100);
  }

  amountCents(): number {
    if (this.tierModel === 'CUSTOM') return this.customCents();
    return this.tiers().find((t) => t.tier === this.tierModel)?.amountCents ?? 0;
  }

  isFull(): boolean {
    return isFullTuition(this.amountCents(), this.goalCents, this.raisedCents);
  }

  canSubmit(): boolean {
    return this.amountCents() > 0 && !this.submitting();
  }

  selectFull(): void {
    this.tierModel = 'FULL';
  }

  docLabel(r: CorporateSponsorshipResult): string {
    return documentTypeLabel(r.invoice.documentType);
  }

  statusLabel(r: CorporateSponsorshipResult): string {
    return invoiceStatusLabel(r.invoice.status);
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.errorMsg.set(null);
    this.submitting.set(true);

    const body: SponsorBody = {
      tier: this.tierModel,
      method: this.method,
      ...(this.tierModel === 'CUSTOM' ? { amountCents: this.customCents() } : {}),
      ...(this.scholarshipName.trim() ? { scholarshipName: this.scholarshipName.trim() } : {}),
      ...(this.logoRecognition ? { logoRecognition: true } : {}),
      ...(this.impactReportOptIn ? { impactReportOptIn: true } : {}),
      ...(this.vatId.trim() ? { vatId: this.vatId.trim() } : {}),
      ...(this.poNumber.trim() ? { poNumber: this.poNumber.trim() } : {}),
    };

    this.api.corporateSponsor(this.campaignId, body).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.result.set(res);
        this.sponsored.emit(res);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? 'Something went wrong');
      },
    });
  }

  reset(): void {
    this.result.set(null);
    this.errorMsg.set(null);
    this.scholarshipName = '';
    this.logoRecognition = false;
    this.impactReportOptIn = false;
    this.vatId = '';
    this.poNumber = '';
    this.customEur = null;
    this.tierModel = 'FULL';
  }
}
