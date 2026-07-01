import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { CurrencyCode, SchoolPayoutAccountView } from '../../core/models';

/**
 * E20 — school-side local payout account settings (SCHOOL_ADMIN). The school registers a
 * local bank / virtual-IBAN account per country/currency so tuition can be paid in its
 * local currency. Payouts always target the school, never a student.
 */
@Component({
  selector: 'app-school-currency-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-3xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">School settings</p>
        <h1 class="font-display text-3xl font-semibold text-ink">Local payout accounts</h1>
        <p class="mt-1 text-sm text-slate2">
          Add a local bank account so tuition is paid in your currency. Funds are always disbursed
          to the school — never to a student.
        </p>
      </header>

      <div class="mb-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h2 class="font-display text-lg font-semibold text-ink">Add an account</h2>
        <form class="mt-4 grid gap-3 sm:grid-cols-2" (ngSubmit)="create()">
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="School ID"
            name="schoolId"
            [(ngModel)]="schoolId"
          />
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Country (ISO-2, e.g. KE)"
            name="country"
            [(ngModel)]="country"
          />
          <select
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            name="currency"
            [(ngModel)]="currency"
          >
            @for (c of currencyCodes; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Bank name"
            name="bankName"
            [(ngModel)]="bankName"
          />
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Account number"
            name="accountNumber"
            [(ngModel)]="accountNumber"
          />
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Virtual IBAN (optional)"
            name="virtualIban"
            [(ngModel)]="virtualIban"
          />
          <button
            type="submit"
            class="rounded-lg bg-brand-green px-3 py-2 text-sm text-white sm:col-span-2"
          >
            Add account
          </button>
          @if (error()) {
            <p class="text-sm text-brand-orange sm:col-span-2">{{ error() }}</p>
          }
        </form>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h2 class="font-display text-lg font-semibold text-ink">Accounts</h2>
        @if (accounts().length === 0) {
          <p class="mt-2 text-sm text-slate2">No local payout accounts yet.</p>
        } @else {
          <ul class="mt-4 space-y-2">
            @for (a of accounts(); track a.id) {
              <li class="flex items-center justify-between rounded-xl bg-mist/40 p-3 text-sm">
                <span class="text-ink">
                  {{ a.country }} · {{ a.currency }} · {{ a.bankName }}
                  @if (a.virtualIban) {
                    · <span class="text-slate2">{{ a.virtualIban }}</span>
                  }
                </span>
                <span
                  class="rounded-full px-2 py-1 text-xs"
                  [class.bg-brand-green]="a.active"
                  [class.text-white]="a.active"
                >
                  {{ a.active ? 'Active' : 'Inactive' }}
                </span>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
})
export class SchoolCurrencyPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly accounts = signal<SchoolPayoutAccountView[]>([]);
  readonly error = signal<string | null>(null);

  readonly currencyCodes: CurrencyCode[] = ['KES', 'NGN', 'GHS', 'BDT', 'PHP', 'VND', 'EUR', 'USD'];

  schoolId = '';
  country = 'KE';
  currency: CurrencyCode = 'KES';
  bankName = '';
  accountNumber = '';
  virtualIban = '';

  ngOnInit(): void {
    // The school id is entered/known by the admin; accounts load once it is set.
  }

  load(): void {
    if (!this.schoolId) {
      return;
    }
    this.api.fxSchoolAccounts(this.schoolId).subscribe({
      next: (a) => this.accounts.set(a),
      error: () => this.accounts.set([]),
    });
  }

  create(): void {
    this.error.set(null);
    this.api
      .fxCreateSchoolAccount({
        schoolId: this.schoolId,
        country: this.country,
        currency: this.currency,
        bankName: this.bankName,
        accountNumber: this.accountNumber,
        virtualIban: this.virtualIban || undefined,
      })
      .subscribe({
        next: () => this.load(),
        error: (err) => this.error.set(err?.error?.error ?? 'Could not create the account.'),
      });
  }
}
