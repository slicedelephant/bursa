import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { HrisConnectionResult, HrisProvider, HrisSyncResult } from '../../core/models';
import { canSync, providerLabel, statusHeadline } from './hris-status';

/**
 * E21 — HRIS connection page (SPONSOR). A corporate admin connects a (mock) HRIS
 * with read-only scopes, then runs an employee sync. No real OAuth happens — the
 * connect is a mock. A write scope is rejected by the backend. Payroll giving is a
 * donor-funding mechanism; matched gifts always go to the school.
 */
@Component({
  selector: 'app-hris-connection-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-3xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">Corporate · Payroll giving</p>
        <h1 class="font-display text-3xl font-semibold text-ink">Connect your HRIS</h1>
        <p class="mt-1 text-sm text-slate2">
          Couple ADP, Workday or another HRIS with read-only access so your employees can give from
          payroll. Bursa never gets write access. Matched gifts always go to the school.
        </p>
      </header>

      <div class="mb-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h2 class="font-display text-lg font-semibold text-ink">New connection</h2>
        <form class="mt-4 grid gap-3 sm:grid-cols-2" (ngSubmit)="connect()">
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Corporate profile ID"
            name="corporateProfileId"
            [(ngModel)]="corporateProfileId"
          />
          <select
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            name="provider"
            [(ngModel)]="provider"
          >
            @for (p of providers; track p) {
              <option [value]="p">{{ label(p) }}</option>
            }
          </select>
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm sm:col-span-2"
            placeholder="Program name"
            name="programName"
            [(ngModel)]="programName"
          />
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm sm:col-span-2"
            placeholder="Read-only scopes (comma-separated, e.g. employees.read,payroll.read)"
            name="scopes"
            [(ngModel)]="scopesRaw"
          />
          <button
            type="submit"
            class="rounded-lg bg-brand-green px-3 py-2 text-sm text-white sm:col-span-2"
          >
            Connect (mock OAuth)
          </button>
          @if (error()) {
            <p class="text-sm text-brand-orange sm:col-span-2">{{ error() }}</p>
          }
        </form>
      </div>

      @if (connection(); as c) {
        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <h2 class="font-display text-lg font-semibold text-ink">Connection</h2>
          <p class="mt-2 text-sm text-ink">{{ headline(c) }}</p>
          <p class="mt-1 text-xs text-slate2">Program: {{ c.programId }}</p>
          @if (sync(); as s) {
            <p class="mt-3 text-sm text-brand-green">Synced {{ s.employeeCount }} employees.</p>
          }
          @if (canSyncNow(c)) {
            <button
              class="mt-4 rounded-lg bg-brand-blue px-3 py-2 text-sm text-white"
              (click)="runSync(c.connectionId)"
            >
              Sync employees
            </button>
          }
        </div>
      }
    </section>
  `,
})
export class HrisConnectionPage {
  private readonly api = inject(ApiService);

  readonly providers: HrisProvider[] = [
    'ADP',
    'WORKDAY',
    'PAYCHEX',
    'PAYLOCITY',
    'UKG',
    'BAMBOOHR',
    'MOCK',
  ];

  corporateProfileId = '';
  provider: HrisProvider = 'ADP';
  programName = '';
  scopesRaw = 'employees.read,payroll.read';

  readonly connection = signal<HrisConnectionResult | null>(null);
  readonly sync = signal<HrisSyncResult | null>(null);
  readonly error = signal<string | null>(null);

  label(provider: HrisProvider): string {
    return providerLabel(provider);
  }

  headline(c: HrisConnectionResult): string {
    return statusHeadline(c.provider, c.status);
  }

  canSyncNow(c: HrisConnectionResult): boolean {
    return canSync(c.status);
  }

  connect(): void {
    this.error.set(null);
    const scopes = this.scopesRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    this.api
      .payrollConnect({
        corporateProfileId: this.corporateProfileId,
        provider: this.provider,
        scopes,
        programName: this.programName,
      })
      .subscribe({
        next: (c) => {
          this.connection.set(c);
          this.sync.set(null);
        },
        error: (err) => this.error.set(err?.error?.error ?? 'Could not connect the HRIS.'),
      });
  }

  runSync(connectionId: string): void {
    this.api.payrollSync(connectionId).subscribe({
      next: (s) => this.sync.set(s),
      error: (err) => this.error.set(err?.error?.error ?? 'Sync failed.'),
    });
  }
}
