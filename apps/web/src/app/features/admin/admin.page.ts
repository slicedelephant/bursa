import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminPayoutsPanelComponent } from './payouts-panel.component';
import { AdminSchoolsPanelComponent } from './schools-panel.component';
import { AdminVerificationQueueComponent } from './verification-queue.component';

type AdminTab = 'verify' | 'schools' | 'payouts';

/** Admin console: verification queue, school payout gate, and disbursements. */
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    RouterLink,
    AdminVerificationQueueComponent,
    AdminSchoolsPanelComponent,
    AdminPayoutsPanelComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-semibold text-ink">Admin console</h1>
          <p class="mt-1 text-sm text-slate2">
            Verify campaigns, gate schools on payout accounts, and disburse funded campaigns.
          </p>
        </div>
        <a
          routerLink="/campaigns"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          View public gallery
        </a>
      </header>

      <div
        class="mb-8 inline-flex rounded-xl bg-mist p-1 ring-1 ring-black/5"
        role="tablist"
        aria-label="Admin sections"
      >
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="selectedTab() === tab.id"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition"
            [class]="
              selectedTab() === tab.id
                ? 'bg-white text-ink shadow-card'
                : 'text-slate2 hover:text-ink'
            "
            (click)="selectedTab.set(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @switch (selectedTab()) {
        @case ('verify') {
          <app-admin-verification-queue />
        }
        @case ('schools') {
          <app-admin-schools-panel />
        }
        @case ('payouts') {
          <app-admin-payouts-panel />
        }
      }
    </section>
  `,
})
export class AdminPage {
  readonly selectedTab = signal<AdminTab>('verify');

  readonly tabs: { id: AdminTab; label: string }[] = [
    { id: 'verify', label: 'Verification queue' },
    { id: 'schools', label: 'Schools' },
    { id: 'payouts', label: 'Payouts' },
  ];
}
