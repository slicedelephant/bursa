import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ActivateEmployeeResult } from '../../core/models';
import { eur } from './payroll-format';

/**
 * E21 — employee-side payroll-giving opt-in. An employee activates payroll giving
 * and sees their remaining annual match budget. Their gift is taken from payroll
 * (donor-funding); the matched money always goes to the school, never to them.
 */
@Component({
  selector: 'app-payroll-optin-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">Payroll giving</p>
        <h1 class="font-display text-3xl font-semibold text-ink">Give from your payroll</h1>
        <p class="mt-1 text-sm text-slate2">
          Opt in to payroll giving. Your employer matches your gift up to your annual budget, and
          everything is disbursed to the student's school — never to you.
        </p>
      </header>

      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <form class="flex gap-2" (ngSubmit)="activate()">
          <input
            class="flex-1 rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Employee profile ID"
            name="employeeProfileId"
            [(ngModel)]="employeeProfileId"
          />
          <button type="submit" class="rounded-lg bg-brand-green px-3 py-2 text-sm text-white">
            Activate
          </button>
        </form>

        @if (result(); as r) {
          <p class="mt-4 text-sm text-brand-green">
            Payroll giving activated. {{ remaining(r) }} match budget remaining this year.
          </p>
        }
        @if (error()) {
          <p class="mt-4 text-sm text-brand-orange">{{ error() }}</p>
        }
      </div>
    </section>
  `,
})
export class PayrollOptinPage {
  private readonly api = inject(ApiService);

  employeeProfileId = '';
  readonly result = signal<ActivateEmployeeResult | null>(null);
  readonly error = signal<string | null>(null);

  remaining(r: ActivateEmployeeResult): string {
    return eur(r.remainingCents);
  }

  activate(): void {
    this.error.set(null);
    this.api.payrollActivate(this.employeeProfileId).subscribe({
      next: (r) => this.result.set(r),
      error: (err) => this.error.set(err?.error?.error ?? 'Could not activate payroll giving.'),
    });
  }
}
