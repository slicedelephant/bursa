import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import {
  ChargebackItem,
  ModerationCaseItem,
  TrustDashboardData,
  TrustHeatMap,
} from '../../../core/models';
import {
  ChargebackQueueComponent,
  EvidenceEvent,
} from './chargeback-queue.component';
import {
  ModerationDecisionEvent,
  ModerationQueueComponent,
} from './moderation-queue.component';
import { TrustDashboardComponent } from './trust-dashboard.component';

type Tab = 'dashboard' | 'moderation' | 'chargebacks';

/**
 * Trust-and-Safety operator console (ADMIN). Loads the dashboard, moderation
 * queue and chargeback queue, and performs operator actions (decide / evidence /
 * refund) which re-load the affected views. Read-and-act only — it never touches
 * the money path; a reject freezes a campaign, a refund offer is a status.
 */
@Component({
  selector: 'app-trust-safety',
  standalone: true,
  imports: [
    RouterLink,
    TrustDashboardComponent,
    ModerationQueueComponent,
    ChargebackQueueComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-semibold text-ink">Trust &amp; Safety</h1>
          <p class="mt-1 text-sm text-slate2">
            Moderation, fraud signals, chargebacks and freezes.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <a
            href="/api/trust-safety/audit.csv"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
          >
            Export audit CSV
          </a>
          <a
            routerLink="/admin"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
          >
            Back to admin
          </a>
        </div>
      </header>

      <nav class="mb-6 flex gap-1 rounded-xl bg-mist p-1 text-sm">
        @for (t of tabs; track t.key) {
          <button
            type="button"
            class="flex-1 rounded-lg px-3 py-1.5 font-medium"
            [class]="tab() === t.key ? 'bg-white text-ink shadow-sm' : 'text-slate2'"
            (click)="setTab(t.key)"
          >
            {{ t.label }}
          </button>
        }
      </nav>

      @if (error()) {
        <p class="mb-4 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange" role="alert">
          {{ error() }}
        </p>
      }

      @switch (tab()) {
        @case ('dashboard') {
          @if (dashboard(); as d) {
            <app-trust-dashboard [data]="d" [heatMap]="heatMap()" />
          } @else {
            <p class="text-sm text-slate2">Loading…</p>
          }
        }
        @case ('moderation') {
          <app-moderation-queue [cases]="cases()" (decide)="onDecide($event)" />
        }
        @case ('chargebacks') {
          <app-chargeback-queue
            [chargebacks]="chargebacks()"
            (submitEvidence)="onEvidence($event)"
            (offerRefund)="onRefund($event)"
          />
        }
      }
    </section>
  `,
})
export class TrustSafetyPage {
  private readonly api = inject(ApiService);

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'moderation', label: 'Moderation' },
    { key: 'chargebacks', label: 'Chargebacks' },
  ];

  readonly tab = signal<Tab>('dashboard');
  readonly dashboard = signal<TrustDashboardData | null>(null);
  readonly heatMap = signal<TrustHeatMap | null>(null);
  readonly cases = signal<ModerationCaseItem[]>([]);
  readonly chargebacks = signal<ChargebackItem[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadAll();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  loadAll(): void {
    this.loadDashboard();
    this.loadModeration();
    this.loadChargebacks();
  }

  loadDashboard(): void {
    this.api.trustDashboard().subscribe({
      next: (d) => this.dashboard.set(d),
      error: () => this.error.set('Could not load the trust dashboard.'),
    });
    this.api.trustHeatMap().subscribe({ next: (h) => this.heatMap.set(h) });
  }

  loadModeration(): void {
    this.api.trustModeration().subscribe({ next: (c) => this.cases.set(c) });
  }

  loadChargebacks(): void {
    this.api.trustChargebacks().subscribe({
      next: (c) => this.chargebacks.set(c),
    });
  }

  onDecide(event: ModerationDecisionEvent): void {
    if (!event.note) {
      this.error.set('A reason is required to decide a case.');
      return;
    }
    this.error.set(null);
    this.api
      .trustDecideModeration(event.id, { action: event.action, note: event.note })
      .subscribe({
        next: () => {
          this.loadModeration();
          this.loadDashboard();
        },
        error: () => this.error.set('The moderation decision failed.'),
      });
  }

  onEvidence(event: EvidenceEvent): void {
    if (!event.note.trim()) {
      this.error.set('An evidence note is required.');
      return;
    }
    this.error.set(null);
    this.api.trustSubmitEvidence(event.id, event.note.trim()).subscribe({
      next: () => this.loadChargebacks(),
      error: () => this.error.set('Could not submit evidence.'),
    });
  }

  onRefund(id: string): void {
    this.error.set(null);
    this.api.trustOfferRefund(id).subscribe({
      next: () => {
        this.loadChargebacks();
        this.loadDashboard();
      },
      error: () => this.error.set('The refund offer was not eligible.'),
    });
  }
}
