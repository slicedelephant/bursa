import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { OnboardingTokenState } from '../../core/models';
import { onboardingStatusClass, onboardingStatusLabel } from './onboarding-progress';

/**
 * Public, token-gated hosted onboarding page (E8). The school completes payout
 * data + signs the agreement in one step via the single-use link — no login.
 */
@Component({
  selector: 'app-school-onboarding-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-xl px-4 py-12">
      <div class="mb-6 text-center">
        <p class="font-display text-sm font-semibold text-brand-green">Bursa partner onboarding</p>
      </div>

      @if (loadError()) {
        <div class="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-black/5">
          <h1 class="font-display text-xl font-semibold text-ink">Link not valid</h1>
          <p class="mt-2 text-sm text-slate2">{{ loadError() }}</p>
          <a
            routerLink="/login"
            class="mt-4 inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
            >Go to login</a
          >
        </div>
      } @else if (done()) {
        <div class="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-black/5">
          <h1 class="font-display text-xl font-semibold text-ink">You're all set</h1>
          <p class="mt-2 text-sm text-slate2">{{ state()?.schoolName }} is now active on Bursa.</p>
          <a
            routerLink="/login"
            class="mt-4 inline-block rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >Sign in to your portal</a
          >
        </div>
      } @else if (state(); as s) {
        <div class="rounded-2xl bg-white p-8 shadow-card ring-1 ring-black/5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h1 class="font-display text-xl font-semibold text-ink">{{ s.schoolName }}</h1>
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
              [class]="statusCls(s.onboardingStatus)"
            >
              {{ statusLabel(s.onboardingStatus) }}
            </span>
          </div>
          <p class="text-sm text-slate2">
            Enter your payout details and sign the funding agreement to activate your school portal.
          </p>

          <div class="mt-5 space-y-3">
            <input
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Bank account name"
              [(ngModel)]="bankAccountName"
            />
            <input
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="IBAN"
              [(ngModel)]="iban"
            />
            <input
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="BIC (optional)"
              [(ngModel)]="bic"
            />
            <input
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Tax ID"
              [(ngModel)]="taxId"
            />
            <input
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Contact person"
              [(ngModel)]="contactName"
            />
            <input
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Contact email"
              [(ngModel)]="contactEmail"
            />
            <input
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Your full name (signature)"
              [(ngModel)]="signerName"
            />
          </div>

          @if (error()) {
            <p
              class="mt-3 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange"
              role="alert"
            >
              {{ error() }}
            </p>
          }

          <button
            type="button"
            class="mt-5 w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            [disabled]="busy()"
            (click)="complete()"
          >
            Complete onboarding & sign agreement
          </button>
        </div>
      } @else {
        <p class="text-center text-sm text-slate2">Loading…</p>
      }
    </section>
  `,
})
export class SchoolOnboardingPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly token = input<string>('');

  readonly state = signal<OnboardingTokenState | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly done = signal(false);

  readonly bankAccountName = signal('');
  readonly iban = signal('');
  readonly bic = signal('');
  readonly taxId = signal('');
  readonly contactName = signal('');
  readonly contactEmail = signal('');
  readonly signerName = signal('');

  ngOnInit(): void {
    this.api.onboardingState(this.token()).subscribe({
      next: (s) => this.state.set(s),
      error: (err) => this.loadError.set(this.message(err)),
    });
  }

  complete(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api
      .completeOnboarding(this.token(), {
        bankAccountName: this.bankAccountName(),
        iban: this.iban(),
        bic: this.bic() || undefined,
        taxId: this.taxId(),
        contactName: this.contactName(),
        contactEmail: this.contactEmail(),
        signerName: this.signerName(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.done.set(true);
        },
        error: (err) => {
          this.error.set(this.message(err));
          this.busy.set(false);
        },
      });
  }

  statusLabel(status: OnboardingTokenState['onboardingStatus']): string {
    return onboardingStatusLabel(status);
  }

  statusCls(status: OnboardingTokenState['onboardingStatus']): string {
    return onboardingStatusClass(status);
  }

  private message(err: { error?: { error?: { message?: string } } }): string {
    return err?.error?.error?.message ?? 'Something went wrong';
  }
}
