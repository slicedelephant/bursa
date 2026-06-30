import { Component, computed, input, output, signal } from '@angular/core';
import { maskEmail } from '../../core/pii-mask';
import { DELETE_CONFIRM_TEXT } from './account-security';

/**
 * GDPR self-service panel: export own data and delete (anonymise) the account.
 * Presentational — emits intent to the host page, which performs the API calls
 * and the file download. Deletion is two-step (a confirm gate) and the panel
 * collapses to an "anonymised" state once done.
 */
@Component({
  selector: 'app-privacy-panel',
  standalone: true,
  template: `
    <section class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Your data & privacy</h2>

      @if (anonymized()) {
        <p class="mt-2 text-sm text-slate2" data-testid="anonymized">
          This account has been anonymised. Your personal data was removed; your past donations
          remain recorded without it.
        </p>
      } @else {
        <p class="mt-1 text-sm text-slate2">
          Signed in as <span class="font-medium text-ink">{{ maskedEmail() }}</span
          >.
        </p>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            [disabled]="busy()"
            (click)="exportRequested.emit()"
            class="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Export my data
          </button>

          @if (!confirming()) {
            <button
              type="button"
              [disabled]="busy()"
              (click)="confirming.set(true)"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-brand-orange ring-1 ring-brand-orange/40 hover:bg-brand-orange/5 disabled:opacity-50"
            >
              Delete my account
            </button>
          }
        </div>

        @if (confirming()) {
          <div class="mt-4 rounded-lg bg-brand-orange/5 p-4" data-testid="confirm">
            <p class="text-sm text-ink">{{ confirmText }}</p>
            <div class="mt-3 flex gap-3">
              <button
                type="button"
                [disabled]="busy()"
                (click)="deleteRequested.emit()"
                class="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Yes, delete my account
              </button>
              <button
                type="button"
                (click)="confirming.set(false)"
                class="rounded-lg px-4 py-2 text-sm font-semibold text-slate2 ring-1 ring-slate-200 hover:bg-mist"
              >
                Cancel
              </button>
            </div>
          </div>
        }
      }
    </section>
  `,
})
export class PrivacyPanelComponent {
  readonly email = input<string>('');
  readonly anonymized = input<boolean>(false);
  readonly busy = input<boolean>(false);

  readonly exportRequested = output<void>();
  readonly deleteRequested = output<void>();

  readonly confirming = signal(false);
  readonly maskedEmail = computed(() => maskEmail(this.email()));
  readonly confirmText = DELETE_CONFIRM_TEXT;
}
