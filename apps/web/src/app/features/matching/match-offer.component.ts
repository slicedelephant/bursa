import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { MatchClaimResult, MatchOffer } from '../../core/models';
import { claimCtaKind } from './match-format';
import { resolveLocale } from './employer-label';

/**
 * Employer-match callout in the checkout. After a donation the donor can enter
 * their work email; if their employer matches we surface a prominent offer with a
 * 1-tap claim CTA (pre-filled link or generated PDF). The matched euros become
 * committed funds toward the same campaign goal — still paid to the school.
 */
@Component({
  selector: 'app-match-offer',
  standalone: true,
  imports: [FormsModule, MoneyPipe],
  template: `
    <div class="rounded-2xl bg-brand-green/5 p-6 ring-1 ring-brand-green/20">
      <div class="flex items-center gap-2">
        <span class="text-xl" aria-hidden="true">✨</span>
        <h3 class="font-display text-lg font-semibold text-ink">Double your impact</h3>
      </div>
      <p class="mt-1 text-sm text-slate2">
        Many employers match charitable gifts. Check yours — it's free money toward this student's
        tuition.
      </p>

      @if (!offer()) {
        <form class="mt-4 flex flex-col gap-2 sm:flex-row" (ngSubmit)="check()">
          <input
            name="workEmail"
            type="email"
            [(ngModel)]="workEmail"
            placeholder="you@employer.com"
            class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <button
            type="submit"
            [disabled]="!canCheck()"
            class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            @if (checking()) {
              Checking…
            } @else {
              Check my employer
            }
          </button>
        </form>
        @if (notFound()) {
          <p class="mt-2 text-sm text-slate2">
            We couldn't find a matching program for that domain — but thank you for checking!
          </p>
        }
      } @else {
        <div class="mt-4 rounded-xl bg-white p-4 ring-1 ring-brand-green/30">
          <p class="font-display text-base font-semibold text-brand-green">
            {{ offer()!.labels.headline }}
          </p>
          <p class="mt-1 text-sm text-slate2">
            {{ offer()!.employerName }} matches up to
            <span class="font-semibold text-ink">{{ offer()!.annualCapCents | money }}</span>
            per year. {{ offer()!.labels.balance }}.
          </p>

          @if (claimed()) {
            <p class="mt-3 rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
              Match claimed — {{ claimed()!.matchCents | money }} committed to this campaign.
            </p>
            @if (claimed()!.applyUrl) {
              <a
                [href]="claimed()!.applyUrl"
                target="_blank"
                rel="noopener"
                class="mt-2 inline-block text-sm font-medium text-brand-green hover:underline"
              >
                Open your employer's matching form →
              </a>
            }
            @if (claimed()!.documentUrl) {
              <a
                [href]="claimed()!.documentUrl"
                target="_blank"
                rel="noopener"
                class="mt-2 inline-block text-sm font-medium text-brand-green hover:underline"
              >
                Download your claim PDF →
              </a>
            }
          } @else {
            <button
              type="button"
              (click)="claim()"
              [disabled]="claiming()"
              class="mt-3 w-full rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              @if (claiming()) {
                Claiming…
              } @else {
                {{ offer()!.labels.cta }}
              }
            </button>
            <p class="mt-1 text-center text-xs text-slate2">
              {{ ctaHint() }}
            </p>
          }
        </div>
      }

      @if (errorMsg()) {
        <p class="mt-2 rounded-lg bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange">
          {{ errorMsg() }}
        </p>
      }
    </div>
  `,
})
export class MatchOfferComponent {
  private readonly api = inject(ApiService);

  readonly campaignId = input.required<string>();
  readonly donationId = input.required<string>();
  readonly donationCents = input.required<number>();

  workEmail = '';

  readonly offer = signal<MatchOffer | null>(null);
  readonly claimed = signal<MatchClaimResult | null>(null);
  readonly checking = signal(false);
  readonly claiming = signal(false);
  readonly notFound = signal(false);
  readonly errorMsg = signal<string | null>(null);

  private get locale(): 'en' | 'de' | 'fr' | 'es' {
    return resolveLocale(navigator.language);
  }

  canCheck(): boolean {
    return this.workEmail.includes('@') && !this.checking();
  }

  ctaHint(): string {
    const o = this.offer();
    return o && claimCtaKind(o) === 'pdf'
      ? 'We generate a claim PDF for your employer portal.'
      : 'We open a pre-filled application for your employer.';
  }

  check(): void {
    if (!this.canCheck()) return;
    this.errorMsg.set(null);
    this.notFound.set(false);
    this.checking.set(true);
    this.api
      .matchOffer({
        campaignId: this.campaignId(),
        donationCents: this.donationCents(),
        workEmail: this.workEmail.trim(),
        locale: this.locale,
      })
      .subscribe({
        next: (offer) => {
          this.checking.set(false);
          if (offer.eligible) {
            this.offer.set(offer);
          } else {
            this.notFound.set(true);
          }
        },
        error: (err) => {
          this.checking.set(false);
          this.errorMsg.set(err?.error?.error?.message ?? 'Could not check your employer');
        },
      });
  }

  claim(): void {
    if (this.claiming()) return;
    this.errorMsg.set(null);
    this.claiming.set(true);
    this.api
      .matchClaim({
        donationId: this.donationId(),
        workEmail: this.workEmail.trim(),
        locale: this.locale,
      })
      .subscribe({
        next: (result) => {
          this.claiming.set(false);
          this.claimed.set(result);
        },
        error: (err) => {
          this.claiming.set(false);
          this.errorMsg.set(err?.error?.error?.message ?? 'Could not claim your match');
        },
      });
  }
}
