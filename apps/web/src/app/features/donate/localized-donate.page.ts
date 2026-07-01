import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  CountryMethods,
  CurrencyCode,
  CurrencyInfo,
  InitiateDepositResult,
  LocalPaymentMethod,
} from '../../core/models';
import { toMinor } from './currency-format';
import { fxSummary, rateLine } from './fx-display';
import { methodBadge, methodLabel } from './method-labels';
import { label, normalizeLocale } from './i18n-resolve';

/**
 * E20 — localized donor deposit flow. The donor picks a country, currency and a local
 * payment method (M-Pesa, GCash, …) and sees the frozen FX rate + what the SCHOOL will
 * receive. The deposit is initiated via the mock LocalDepositProvider; the money always
 * flows to the school, never to a student.
 */
@Component({
  selector: 'app-localized-donate-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-xl px-4 py-10">
      <header class="mb-6">
        <p class="text-sm font-medium text-brand-green">{{ t('to_school') }}</p>
        <h1 class="font-display text-3xl font-semibold text-ink">Support this student</h1>
        <p class="mt-1 text-sm text-slate2">
          Your gift is paid directly to the verified school — never to the student.
        </p>
      </header>

      @if (done(); as d) {
        <div class="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-black/5">
          <h2 class="font-display text-2xl font-semibold text-ink">Deposit {{ d.status }}</h2>
          <p class="mt-2 text-sm text-slate2">
            Locked rate {{ d.lockedRate }} · school receives {{ d.payoutAmountMinor }}
            {{ d.payoutCurrency }} (minor units)
          </p>
        </div>
      } @else {
        <form
          class="space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5"
          (ngSubmit)="submit()"
        >
          <label class="block">
            <span class="text-sm text-ink">Country</span>
            <select
              class="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
              name="country"
              [(ngModel)]="country"
              (ngModelChange)="onCountryChange()"
            >
              <option value="KE">Kenya</option>
              <option value="NG">Nigeria</option>
              <option value="PH">Philippines</option>
              <option value="BD">Bangladesh</option>
              <option value="GH">Ghana</option>
            </select>
          </label>

          <label class="block">
            <span class="text-sm text-ink">Language</span>
            <select
              class="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
              name="locale"
              [(ngModel)]="locale"
              (ngModelChange)="onLocaleChange()"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
              <option value="yo">Yorùbá</option>
              <option value="bn">বাংলা</option>
              <option value="tl">Tagalog</option>
            </select>
          </label>

          <label class="block">
            <span class="text-sm text-ink">{{ t('amount') }}</span>
            <div class="mt-1 flex gap-2">
              <input
                class="w-full rounded-lg border border-mist px-3 py-2 text-sm"
                type="number"
                name="amount"
                [(ngModel)]="amountMajor"
                (ngModelChange)="refreshQuote()"
              />
              <select
                class="rounded-lg border border-mist px-3 py-2 text-sm"
                name="depositCurrency"
                [(ngModel)]="depositCurrency"
                (ngModelChange)="refreshQuote()"
              >
                @for (c of currencies(); track c.code) {
                  <option [value]="c.code">{{ c.code }}</option>
                }
              </select>
            </div>
          </label>

          <div>
            <span class="text-sm text-ink">{{ t('pay_with') }}</span>
            <div class="mt-1 flex flex-wrap gap-2">
              @for (m of methods(); track m) {
                <button
                  type="button"
                  class="rounded-full px-3 py-1 text-xs {{ badge(m) }}"
                  [class.ring-2]="m === method"
                  (click)="method = m"
                >
                  {{ mLabel(m) }}
                </button>
              }
            </div>
          </div>

          @if (quoteLine()) {
            <p class="rounded-lg bg-mist/40 p-3 text-xs text-slate2">
              {{ quoteLine() }}<br />{{ summaryLine() }}
            </p>
          }

          <button
            type="submit"
            class="w-full rounded-lg bg-brand-green px-3 py-2 text-sm text-white"
          >
            {{ t('confirm') }}
          </button>
          @if (error()) {
            <p class="text-sm text-brand-orange">{{ error() }}</p>
          }
        </form>
      }
    </section>
  `,
})
export class LocalizedDonatePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly currencies = signal<CurrencyInfo[]>([]);
  readonly methods = signal<LocalPaymentMethod[]>([]);
  readonly labels = signal<Record<string, string>>({});
  readonly quoteLine = signal<string>('');
  readonly summaryLine = signal<string>('');
  readonly done = signal<InitiateDepositResult | null>(null);
  readonly error = signal<string | null>(null);

  country = 'KE';
  locale = 'sw';
  amountMajor = 50;
  depositCurrency: CurrencyCode = 'USD';
  payoutCurrency: CurrencyCode = 'KES';
  method: LocalPaymentMethod = 'MPESA';

  private campaignId = '';
  private lockedRate = 0;

  t = (key: string) => label(this.labels(), key);
  mLabel = methodLabel;
  badge = methodBadge;

  ngOnInit(): void {
    this.campaignId = this.route.snapshot.paramMap.get('campaignId') ?? '';
    this.api.fxCurrencies().subscribe((c) => this.currencies.set(c));
    this.onCountryChange();
    this.onLocaleChange();
    this.refreshQuote();
  }

  onCountryChange(): void {
    this.payoutCurrency = this.countryCurrency(this.country);
    this.api.fxMethods(this.country).subscribe((r: CountryMethods) => {
      this.methods.set(r.methods);
      this.method = r.methods[0] ?? 'CARD';
    });
    this.refreshQuote();
  }

  onLocaleChange(): void {
    this.api.fxLabels(normalizeLocale(this.locale)).subscribe((r) => this.labels.set(r.labels));
  }

  refreshQuote(): void {
    this.api.fxQuote(this.depositCurrency, this.payoutCurrency).subscribe({
      next: (q) => {
        this.lockedRate = q.rate;
        this.quoteLine.set(rateLine(this.depositCurrency, this.payoutCurrency, q.rate));
        this.summaryLine.set(
          fxSummary(
            toMinor(this.amountMajor, this.depositCurrency),
            this.depositCurrency,
            this.payoutCurrency,
            q.rate,
          ),
        );
      },
      error: () => {
        this.quoteLine.set('');
        this.summaryLine.set('');
      },
    });
  }

  submit(): void {
    this.error.set(null);
    this.api
      .fxInitiateDeposit({
        campaignId: this.campaignId,
        amountMinor: toMinor(this.amountMajor, this.depositCurrency),
        depositCurrency: this.depositCurrency,
        method: this.method,
        country: this.country,
        payoutCurrency: this.payoutCurrency,
      })
      .subscribe({
        next: (r) => this.done.set(r),
        error: (err) => this.error.set(err?.error?.error ?? 'Deposit could not be started.'),
      });
  }

  private countryCurrency(country: string): CurrencyCode {
    const map: Record<string, CurrencyCode> = {
      KE: 'KES',
      NG: 'NGN',
      PH: 'PHP',
      BD: 'BDT',
      GH: 'GHS',
    };
    return map[country] ?? 'USD';
  }
}
