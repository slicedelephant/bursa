import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MoneyPipe } from '../../core/money.pipe';
import {
  DonorHistory,
  NotificationFeed,
  Receipt,
  RecurringPledge,
} from '../../core/models';
import { ReceiptPanelComponent } from '../sponsor/receipt-panel.component';
import { DonationHistoryComponent } from './donation-history.component';
import { recurringLabel, repeatLabel, supportedLabel } from './donor-summary';
import { NotificationsFeedComponent } from './notifications-feed.component';
import { RecurringListComponent } from './recurring-list.component';

/** Donor account: lifetime impact, donation history + receipts, impact feed, monthly giving. */
@Component({
  selector: 'app-donor-page',
  standalone: true,
  imports: [
    MoneyPipe,
    DonationHistoryComponent,
    NotificationsFeedComponent,
    RecurringListComponent,
    ReceiptPanelComponent,
  ],
  template: `
    <section class="mx-auto max-w-5xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">{{ greeting() }}</p>
        <h1 class="font-display text-3xl font-semibold text-ink">Your giving</h1>
      </header>

      @if (history(); as h) {
        <div class="mb-8 grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <p class="text-xs uppercase tracking-wide text-slate2">Total given</p>
            <p class="mt-1 font-display text-2xl font-bold text-ink">
              {{ h.summary.totalDonatedCents | money: true }}
            </p>
            <p class="mt-1 text-xs text-slate2">{{ supported() }}</p>
          </div>
          <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <p class="text-xs uppercase tracking-wide text-slate2">Donations</p>
            <p class="mt-1 font-display text-2xl font-bold text-ink">
              {{ h.summary.donationCount }}
            </p>
            <p class="mt-1 text-xs text-slate2">{{ repeat() }}</p>
          </div>
          <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <p class="text-xs uppercase tracking-wide text-slate2">Monthly giving</p>
            <p class="mt-1 font-display text-2xl font-bold text-ink">
              {{ h.summary.activeRecurringCount }}
            </p>
            <p class="mt-1 text-xs text-slate2">{{ recurringText() }}</p>
          </div>
        </div>
      }

      @if (toast(); as t) {
        <p class="mb-6 rounded-lg bg-brand-green/10 px-4 py-2 text-sm text-brand-green">{{ t }}</p>
      }

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          @if (history(); as h) {
            <app-donation-history [donations]="h.donations" (receipt)="openReceipt($event)" />
          }
          @if (recurring(); as r) {
            <app-recurring-list
              [pledges]="r"
              (pause)="setStatus($event, 'pause')"
              (resume)="setStatus($event, 'resume')"
              (cancel)="setStatus($event, 'cancel')"
              (run)="runRecurring()"
            />
          }
        </div>
        <div>
          @if (feed(); as f) {
            <app-notifications-feed [feed]="f" (read)="markRead($event)" />
          }
        </div>
      </div>
    </section>

    @if (receipt(); as r) {
      <app-receipt-panel [receipt]="r" (close)="receipt.set(null)" />
    }
  `,
})
export class DonorPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly history = signal<DonorHistory | null>(null);
  readonly feed = signal<NotificationFeed | null>(null);
  readonly recurring = signal<RecurringPledge[] | null>(null);
  readonly receipt = signal<Receipt | null>(null);
  readonly toast = signal<string | null>(null);

  ngOnInit(): void {
    this.reloadHistory();
    this.reloadFeed();
    this.reloadRecurring();
  }

  greeting(): string {
    return `Welcome back, ${this.auth.user()?.displayName ?? 'friend'}`;
  }

  supported(): string {
    const h = this.history();
    return h ? supportedLabel(h.summary) : '';
  }

  repeat(): string {
    const h = this.history();
    return h ? repeatLabel(h.summary) : '';
  }

  recurringText(): string {
    return recurringLabel(this.history()?.summary.activeRecurringCount ?? 0);
  }

  openReceipt(donationId: string): void {
    this.api.donorReceipt(donationId).subscribe({
      next: (r) => this.receipt.set(r),
    });
  }

  markRead(id: string): void {
    this.api.markNotificationRead(id).subscribe({ next: () => this.reloadFeed() });
  }

  setStatus(id: string, action: 'pause' | 'resume' | 'cancel'): void {
    this.api.setRecurringStatus(id, action).subscribe({
      next: () => {
        this.reloadRecurring();
        this.reloadHistory();
      },
    });
  }

  runRecurring(): void {
    this.api.runRecurring().subscribe({
      next: (res) => {
        const n = res.charged.length;
        this.toast.set(
          n > 0
            ? `Processed ${n} monthly gift${n === 1 ? '' : 's'}.`
            : 'No monthly gifts were due.',
        );
        this.reloadRecurring();
        this.reloadHistory();
        this.reloadFeed();
      },
    });
  }

  private reloadHistory(): void {
    this.api.donorHistory().subscribe({ next: (h) => this.history.set(h) });
  }

  private reloadFeed(): void {
    this.api.listNotifications().subscribe({ next: (f) => this.feed.set(f) });
  }

  private reloadRecurring(): void {
    this.api.listRecurring().subscribe({ next: (r) => this.recurring.set(r) });
  }
}
