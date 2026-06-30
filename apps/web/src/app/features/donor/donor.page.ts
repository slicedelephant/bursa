import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MoneyPipe } from '../../core/money.pipe';
import {
  DonorHistory,
  DonorReferralView,
  MatchBalance,
  NotificationFeed,
  PortfolioView,
  Receipt,
  RecurringPledge,
} from '../../core/models';
import { ReceiptPanelComponent } from '../sponsor/receipt-panel.component';
import { ClaimHistoryComponent } from '../matching/claim-history.component';
import { MatchBalanceComponent } from '../matching/match-balance.component';
import { ReferralCtaComponent } from '../referral/referral-cta.component';
import { ReferralPanelComponent } from '../referral/referral-panel.component';
import { DonationHistoryComponent } from './donation-history.component';
import { recurringLabel, repeatLabel, supportedLabel } from './donor-summary';
import { NotificationsFeedComponent } from './notifications-feed.component';
import { PortfolioGridComponent } from './portfolio-grid.component';
import { PortfolioStatsComponent } from './portfolio-stats.component';
import { RecurringListComponent } from './recurring-list.component';
import { StreakBannerComponent } from './streak-banner.component';

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
    MatchBalanceComponent,
    ClaimHistoryComponent,
    StreakBannerComponent,
    PortfolioStatsComponent,
    PortfolioGridComponent,
    ReferralPanelComponent,
    ReferralCtaComponent,
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

      @if (portfolio(); as p) {
        <div class="mb-8 space-y-6">
          <app-streak-banner [streak]="p.streak" [badge]="p.badge" />
          <app-portfolio-stats [stats]="p.stats" [peer]="p.peer" />
          <app-portfolio-grid [items]="p.items" (donateAgain)="goToCampaign($event)" />
          @if (p.items.length > 0) {
            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                (click)="exportPortfolio('csv')"
                class="rounded-lg ring-1 ring-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              >
                Export CSV
              </button>
              <button
                type="button"
                (click)="exportPortfolio('pdf')"
                class="rounded-lg ring-1 ring-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              >
                Export PDF
              </button>
            </div>
          }
          @if (referral(); as r) {
            <app-referral-cta
              [shareUrl]="r.link.shareUrl"
              (share)="copyReferral(r.link.shareUrl)"
            />
          }
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
        <div class="space-y-6">
          @if (referral(); as r) {
            <app-referral-panel
              [view]="r"
              [copied]="referralCopied()"
              (copyRequested)="copyReferral($event)"
              (optInChanged)="setReferralOptIn($event)"
            />
          }
          @if (matchBalance(); as b) {
            <app-match-balance [balance]="b" />
            <app-claim-history [claims]="b.claims" />
          }
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
  private readonly router = inject(Router);

  readonly history = signal<DonorHistory | null>(null);
  readonly feed = signal<NotificationFeed | null>(null);
  readonly recurring = signal<RecurringPledge[] | null>(null);
  readonly receipt = signal<Receipt | null>(null);
  readonly toast = signal<string | null>(null);
  readonly matchBalance = signal<MatchBalance | null>(null);
  readonly portfolio = signal<PortfolioView | null>(null);
  readonly referral = signal<DonorReferralView | null>(null);
  readonly referralCopied = signal(false);

  ngOnInit(): void {
    this.reloadHistory();
    this.reloadFeed();
    this.reloadRecurring();
    this.reloadMatchBalance();
    this.reloadPortfolio();
    this.reloadReferral();
  }

  private reloadReferral(): void {
    this.api.donorReferral().subscribe({ next: (r) => this.referral.set(r) });
  }

  copyReferral(text: string): void {
    void navigator.clipboard?.writeText(text).then(
      () => {
        this.referralCopied.set(true);
        setTimeout(() => this.referralCopied.set(false), 2000);
      },
      () => undefined,
    );
  }

  setReferralOptIn(optIn: boolean): void {
    this.api.setReferralOptIn(optIn).subscribe({
      next: () => this.reloadReferral(),
    });
  }

  goToCampaign(campaignId: string): void {
    this.router.navigate(['/campaigns', campaignId]);
  }

  exportPortfolio(format: 'csv' | 'pdf'): void {
    this.api.donorPortfolioExport(format).subscribe({
      next: (blob) => this.downloadBlob(blob, `bursa-portfolio.${format}`),
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private reloadPortfolio(): void {
    this.api.donorPortfolio().subscribe({ next: (p) => this.portfolio.set(p) });
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

  private reloadMatchBalance(): void {
    this.api.matchBalance().subscribe({ next: (b) => this.matchBalance.set(b) });
  }
}
