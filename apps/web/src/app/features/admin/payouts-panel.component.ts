import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { CampaignCard, Payout, PayoutStatus } from '../../core/models';

/** Section C: disburse funded campaigns to the school + ledger of payouts. */
@Component({
  selector: 'app-admin-payouts-panel',
  standalone: true,
  imports: [RouterLink, MoneyPipe],
  template: `
    <div class="space-y-8">
      <div
        class="rounded-xl bg-brand-blue/10 px-4 py-3 text-sm text-ink ring-1 ring-brand-blue/20"
      >
        Funds are always disbursed to the verified <span class="font-semibold">school</span>, never to the
        student directly.
      </div>

      @if (error()) {
        <div class="rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange ring-1 ring-brand-orange/20">
          {{ error() }}
        </div>
      }

      @if (success()) {
        <div class="rounded-lg bg-brand-green/10 px-4 py-3 text-sm text-brand-green ring-1 ring-brand-green/20">
          {{ success() }}
        </div>
      }

      <!-- Funded campaigns ready to disburse -->
      <section class="space-y-4">
        <header class="flex items-end justify-between gap-4">
          <div>
            <h2 class="font-display text-xl font-semibold text-ink">Ready to disburse</h2>
            <p class="text-sm text-slate2">Fully funded campaigns awaiting payout to the school.</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist"
            (click)="reload()"
          >
            Refresh
          </button>
        </header>

        @if (loadingFunded()) {
          <p class="text-sm text-slate2">Loading funded campaigns…</p>
        } @else if (funded().length === 0) {
          <div class="rounded-2xl bg-white p-6 text-sm text-slate2 shadow-card ring-1 ring-black/5">
            No funded campaigns awaiting payout.
          </div>
        } @else {
          <ul class="space-y-4">
            @for (c of funded(); track c.id) {
              <li
                class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5"
              >
                <div class="min-w-0 space-y-1">
                  <a
                    [routerLink]="['/campaigns', c.id]"
                    class="font-display text-lg font-semibold text-ink hover:text-brand-green"
                  >
                    {{ c.title }}
                  </a>
                  <p class="text-sm text-slate2">
                    {{ c.studentName }} · to {{ c.schoolName }} ({{ c.schoolCountry }})
                  </p>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <p class="text-xs uppercase tracking-wide text-slate2">Raised</p>
                    <p class="font-display text-lg font-semibold text-ink">{{ c.raisedCents | money }}</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    [disabled]="busyId() === c.id"
                    (click)="disburse(c)"
                  >
                    {{ busyId() === c.id ? 'Disbursing…' : 'Disburse to school' }}
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </section>

      <!-- Existing payouts ledger -->
      <section class="space-y-4">
        <h2 class="font-display text-xl font-semibold text-ink">Payouts</h2>

        @if (loadingPayouts()) {
          <p class="text-sm text-slate2">Loading payouts…</p>
        } @else if (payouts().length === 0) {
          <div class="rounded-2xl bg-white p-6 text-sm text-slate2 shadow-card ring-1 ring-black/5">
            No payouts recorded yet.
          </div>
        } @else {
          <div class="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
            <table class="w-full text-left text-sm">
              <thead class="bg-mist text-xs uppercase tracking-wide text-slate2">
                <tr>
                  <th class="px-5 py-3 font-semibold">Campaign</th>
                  <th class="px-5 py-3 font-semibold">School</th>
                  <th class="px-5 py-3 font-semibold">Amount</th>
                  <th class="px-5 py-3 font-semibold">Status</th>
                  <th class="px-5 py-3 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (p of payouts(); track p.id) {
                  <tr>
                    <td class="px-5 py-4 font-medium text-ink">
                      {{ p.campaign?.title ?? '—' }}
                    </td>
                    <td class="px-5 py-4 text-slate2">{{ p.school?.name ?? '—' }}</td>
                    <td class="px-5 py-4 font-semibold text-ink">{{ p.amountCents | money }}</td>
                    <td class="px-5 py-4">
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        [class]="statusClass(p.status)"
                      >
                        {{ p.status }}
                      </span>
                    </td>
                    <td class="px-5 py-4 font-mono text-xs text-slate2">{{ p.reference }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
})
export class AdminPayoutsPanelComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly funded = signal<CampaignCard[]>([]);
  readonly payouts = signal<Payout[]>([]);
  readonly loadingFunded = signal(true);
  readonly loadingPayouts = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  statusClass(status: PayoutStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-brand-green/10 text-brand-green';
      case 'SENT':
        return 'bg-brand-blue/10 text-brand-blue';
      default:
        return 'bg-mist text-slate2';
    }
  }

  reload(): void {
    this.loadFunded();
    this.loadPayouts();
  }

  private loadFunded(): void {
    this.loadingFunded.set(true);
    this.error.set(null);
    this.api.gallery({ status: 'FUNDED' }).subscribe({
      next: (v) => {
        this.funded.set(v);
        this.loadingFunded.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.loadingFunded.set(false);
      },
    });
  }

  private loadPayouts(): void {
    this.loadingPayouts.set(true);
    this.api.payouts().subscribe({
      next: (v) => {
        this.payouts.set(v);
        this.loadingPayouts.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.loadingPayouts.set(false);
      },
    });
  }

  disburse(c: CampaignCard): void {
    this.busyId.set(c.id);
    this.error.set(null);
    this.success.set(null);
    this.api.payoutCampaign(c.id).subscribe({
      next: (p) => {
        this.busyId.set(null);
        this.success.set(`Disbursed ${c.title} to ${c.schoolName}. Reference ${p.reference}.`);
        this.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.busyId.set(null);
      },
    });
  }
}
