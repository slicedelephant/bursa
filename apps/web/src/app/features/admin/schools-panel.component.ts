import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { School } from '../../core/models';

/** Section B: schools + payout-account verification gate. */
@Component({
  selector: 'app-admin-schools-panel',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-4">
      <header class="flex items-end justify-between gap-4">
        <div>
          <h2 class="font-display text-xl font-semibold text-ink">Schools</h2>
          <p class="text-sm text-slate2">
            A school’s payout account must be verified before any of its campaigns can go LIVE.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist"
          (click)="load()"
        >
          Refresh
        </button>
      </header>

      @if (error()) {
        <div
          class="rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange ring-1 ring-brand-orange/20"
        >
          {{ error() }}
        </div>
      }

      @if (loading()) {
        <p class="text-sm text-slate2">Loading schools…</p>
      } @else if (schools().length === 0) {
        <div class="rounded-2xl bg-white p-6 text-sm text-slate2 shadow-card ring-1 ring-black/5">
          No schools registered yet.
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
          <table class="w-full text-left text-sm">
            <thead class="bg-mist text-xs uppercase tracking-wide text-slate2">
              <tr>
                <th class="px-5 py-3 font-semibold">School</th>
                <th class="px-5 py-3 font-semibold">Country</th>
                <th class="px-5 py-3 font-semibold">Payout verified</th>
                <th class="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (s of schools(); track s.id) {
                <tr>
                  <td class="px-5 py-4">
                    <p class="font-medium text-ink">{{ s.name }}</p>
                    @if (s.payoutAccountRef) {
                      <p class="text-xs text-slate2">{{ s.payoutAccountRef }}</p>
                    }
                  </td>
                  <td class="px-5 py-4 text-slate2">{{ s.country }}</td>
                  <td class="px-5 py-4">
                    @if (s.payoutVerified) {
                      <span
                        class="inline-flex items-center rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold text-brand-green"
                      >
                        Yes
                      </span>
                    } @else {
                      <span
                        class="inline-flex items-center rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-semibold text-brand-orange"
                      >
                        No
                      </span>
                    }
                  </td>
                  <td class="px-5 py-4 text-right">
                    @if (s.payoutVerified) {
                      <span class="text-xs text-slate2">—</span>
                    } @else {
                      <button
                        type="button"
                        class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        [disabled]="busyId() === s.id"
                        (click)="verifyPayout(s)"
                      >
                        {{ busyId() === s.id ? 'Verifying…' : 'Verify payout account' }}
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminSchoolsPanelComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly schools = signal<School[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listSchools().subscribe({
      next: (v) => {
        this.schools.set(v);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.loading.set(false);
      },
    });
  }

  verifyPayout(s: School): void {
    this.busyId.set(s.id);
    this.error.set(null);
    this.api
      .verifySchoolPayout(s.id, {
        payoutVerified: true,
        payoutAccountRef: 'DE00 MOCK 0000 0000 0000 00',
      })
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.load();
        },
        error: (err) => {
          this.error.set(err?.error?.error?.message ?? 'Something went wrong');
          this.busyId.set(null);
        },
      });
  }
}
