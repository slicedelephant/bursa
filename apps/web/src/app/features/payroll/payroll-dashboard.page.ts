import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { CampaignRunResult, ComplianceTrailEntry, PayrollEmployeeList } from '../../core/models';
import { cycleLabel, remainingLabel } from './payroll-format';
import { previewRule } from './match-rule-preview';
import { campaignHeadline } from './campaign-summary-format';

/**
 * E21 — payroll-giving dashboard (SPONSOR). Shows payroll-activated employees,
 * lets the admin configure the firm-wide match rule, trigger a payroll-giving
 * campaign ("match month") and read the compliance trail. Every matched gift is
 * booked to the school, never to an employee.
 */
@Component({
  selector: 'app-payroll-dashboard-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-4xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">Corporate · Payroll giving</p>
        <h1 class="font-display text-3xl font-semibold text-ink">Payroll dashboard</h1>
        <p class="mt-1 text-sm text-slate2">
          Configure matching, run a match month and review the compliance trail. Matched gifts are
          disbursed to the school — never to an employee or student.
        </p>
      </header>

      <div class="mb-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h2 class="font-display text-lg font-semibold text-ink">Employees</h2>
        <div class="mt-3 flex gap-2">
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Connection ID"
            name="connectionId"
            [(ngModel)]="connectionId"
          />
          <button
            class="rounded-lg bg-brand-blue px-3 py-2 text-sm text-white"
            (click)="loadEmployees()"
          >
            Load
          </button>
        </div>
        @if (employees(); as list) {
          <p class="mt-3 text-sm text-slate2">
            {{ list.activatedCount }} of {{ list.totalCount }} employees activated.
          </p>
          <ul class="mt-2 space-y-2">
            @for (e of list.employees; track e.id) {
              <li class="flex items-center justify-between rounded-xl bg-mist/40 p-3 text-sm">
                <span class="text-ink">
                  {{ e.employeeExternalId }} · {{ cycle(e.payrollCycle) }} ·
                  {{ budget(e.remainingCents) }}
                </span>
                <span
                  class="rounded-full px-2 py-1 text-xs"
                  [class.bg-brand-green]="e.active"
                  [class.text-white]="e.active"
                >
                  {{ e.active ? 'Active' : 'Inactive' }}
                </span>
              </li>
            }
          </ul>
        }
      </div>

      <div class="mb-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h2 class="font-display text-lg font-semibold text-ink">Match rule</h2>
        <form class="mt-3 grid gap-3 sm:grid-cols-3" (ngSubmit)="saveRule()">
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Program ID"
            name="programId"
            [(ngModel)]="programId"
          />
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            type="number"
            placeholder="Ratio ×100 (100 = 1:1)"
            name="matchRatio"
            [(ngModel)]="matchRatio"
          />
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            type="number"
            placeholder="Cap cents / employee / year"
            name="cap"
            [(ngModel)]="perEmployeeCapCents"
          />
          <p class="text-xs text-slate2 sm:col-span-3">{{ preview() }}</p>
          <button
            type="submit"
            class="rounded-lg bg-brand-green px-3 py-2 text-sm text-white sm:col-span-3"
          >
            Save rule
          </button>
        </form>
      </div>

      <div class="mb-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h2 class="font-display text-lg font-semibold text-ink">Run a match month</h2>
        <form class="mt-3 grid gap-3 sm:grid-cols-3" (ngSubmit)="runCampaign()">
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Campaign ID"
            name="campaignId"
            [(ngModel)]="campaignId"
          />
          <input
            class="rounded-lg border border-mist px-3 py-2 text-sm"
            type="number"
            placeholder="Contribution cents / employee"
            name="contribution"
            [(ngModel)]="defaultContributionCents"
          />
          <button type="submit" class="rounded-lg bg-brand-orange px-3 py-2 text-sm text-white">
            Run campaign
          </button>
        </form>
        @if (campaignResult(); as r) {
          <p class="mt-3 text-sm text-brand-green">{{ summary(r) }}</p>
        }
        @if (error()) {
          <p class="mt-2 text-sm text-brand-orange">{{ error() }}</p>
        }
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-ink">Compliance trail</h2>
          <button
            class="rounded-lg bg-brand-blue px-3 py-2 text-xs text-white"
            (click)="loadTrail()"
          >
            Refresh
          </button>
        </div>
        @if (trail().length === 0) {
          <p class="mt-2 text-sm text-slate2">No compliance entries yet.</p>
        } @else {
          <ul class="mt-3 space-y-1 text-xs text-slate2">
            @for (t of trail(); track t.createdAt) {
              <li>{{ t.action }} · {{ t.targetType }} · {{ t.createdAt }}</li>
            }
          </ul>
        }
      </div>
    </section>
  `,
})
export class PayrollDashboardPage {
  private readonly api = inject(ApiService);

  connectionId = '';
  programId = '';
  campaignId = '';
  corporateProfileId = '';
  matchRatio = 100;
  perEmployeeCapCents = 50000;
  defaultContributionCents = 10000;

  readonly employees = signal<PayrollEmployeeList | null>(null);
  readonly campaignResult = signal<CampaignRunResult | null>(null);
  readonly trail = signal<ComplianceTrailEntry[]>([]);
  readonly error = signal<string | null>(null);

  cycle = cycleLabel;

  budget(remainingCents: number): string {
    return remainingLabel(remainingCents, this.perEmployeeCapCents);
  }

  preview(): string {
    const p = previewRule({
      contributionCents: this.defaultContributionCents,
      matchRatio: this.matchRatio,
      perEmployeeCapCents: this.perEmployeeCapCents,
    });
    return `${p.ratioLabel} — matches ${p.matchCents / 100} EUR${p.capped ? ' (capped)' : ''}`;
  }

  summary(r: CampaignRunResult): string {
    return campaignHeadline(r);
  }

  loadEmployees(): void {
    if (!this.connectionId) return;
    this.api.payrollEmployees(this.connectionId).subscribe({
      next: (list) => this.employees.set(list),
      error: () => this.employees.set(null),
    });
  }

  saveRule(): void {
    this.error.set(null);
    this.api
      .payrollRule({
        programId: this.programId,
        matchRatio: this.matchRatio,
        perEmployeeCapCents: this.perEmployeeCapCents,
      })
      .subscribe({
        error: (err) => this.error.set(err?.error?.error ?? 'Could not save the rule.'),
      });
  }

  runCampaign(): void {
    this.error.set(null);
    this.api
      .payrollRunCampaign({
        programId: this.programId,
        campaignId: this.campaignId,
        defaultContributionCents: this.defaultContributionCents,
      })
      .subscribe({
        next: (r) => this.campaignResult.set(r),
        error: (err) => this.error.set(err?.error?.error ?? 'Campaign failed.'),
      });
  }

  loadTrail(): void {
    this.api.payrollTrail(this.corporateProfileId).subscribe({
      next: (t) => this.trail.set(t),
      error: () => this.trail.set([]),
    });
  }
}
