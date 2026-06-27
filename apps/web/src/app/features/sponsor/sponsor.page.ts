import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { EsgDashboard, Receipt, SponsorImpact } from '../../core/models';
import { EsgDashboardComponent } from '../corporate/esg-dashboard.component';
import { CompanyProfileFormComponent, CompanyProfileInput } from './company-profile-form.component';
import { ReceiptPanelComponent } from './receipt-panel.component';

/**
 * Corporate sponsor dashboard.
 *
 * - Loads the sponsor's impact summary. A 404 means the sponsor has no
 *   corporate profile yet, which is treated as a "needs profile" setup
 *   step rather than a hard error.
 * - When impact loads: shows impact tiles, supported students, and a list
 *   of receipts that can be opened in a modal panel.
 */
@Component({
  selector: 'app-sponsor-page',
  standalone: true,
  imports: [
    RouterLink,
    MoneyPipe,
    DatePipe,
    CompanyProfileFormComponent,
    ReceiptPanelComponent,
    EsgDashboardComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <header class="mb-8">
        <h1 class="font-display text-3xl font-bold text-ink">Sponsor dashboard</h1>
        <p class="mt-1 text-slate2">
          Track your sponsorship impact and download donation receipts.
        </p>
      </header>

      @if (loading()) {
        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <p class="text-slate2">Loading your dashboard…</p>
        </div>
      } @else if (error()) {
        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <p class="font-semibold text-brand-orange">{{ error() }}</p>
          <button
            type="button"
            (click)="loadImpact()"
            class="mt-4 rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist"
          >
            Try again
          </button>
        </div>
      } @else if (needsProfile()) {
        <app-company-profile-form
          [saving]="savingProfile()"
          [error]="profileError()"
          (save)="saveProfile($event)"
        />
      } @else if (impact(); as imp) {
        <!-- Impact tiles -->
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
            <p class="text-sm font-medium text-slate2">Total committed</p>
            <p class="mt-1 font-display text-3xl font-bold text-brand-green">
              {{ imp.totalCommittedCents | money }}
            </p>
          </div>
          <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
            <p class="text-sm font-medium text-slate2">Students supported</p>
            <p class="mt-1 font-display text-3xl font-bold text-ink">{{ imp.studentsSupported }}</p>
          </div>
          <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
            <p class="text-sm font-medium text-slate2">Campaigns supported</p>
            <p class="mt-1 font-display text-3xl font-bold text-ink">
              {{ imp.campaignsSupported.length }}
            </p>
          </div>
        </div>

        <!-- ESG / CSR impact dashboard -->
        @if (esg(); as e) {
          <div class="mt-10">
            <app-esg-dashboard
              [dashboard]="e"
              (exportCsv)="exportEsg('csv')"
              (exportPdf)="exportEsg('pdf')"
            />
          </div>
        }

        <!-- Students you support -->
        <div class="mt-10">
          <h2 class="font-display text-xl font-semibold text-ink">Students you support</h2>
          @if (imp.campaignsSupported.length) {
            <ul class="mt-4 grid gap-3">
              @for (c of imp.campaignsSupported; track c.campaignId) {
                <li
                  class="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5"
                >
                  <div>
                    <p class="font-semibold text-ink">{{ c.title }}</p>
                    <p class="text-sm text-slate2">{{ c.schoolName }}</p>
                  </div>
                  <span class="whitespace-nowrap font-semibold text-brand-green">{{
                    c.amountCents | money
                  }}</span>
                </li>
              }
            </ul>
          } @else {
            <p class="mt-3 text-slate2">
              No pledges yet. Browse campaigns below to support a student.
            </p>
          }
        </div>

        <!-- Receipts -->
        <div class="mt-10">
          <h2 class="font-display text-xl font-semibold text-ink">Receipts</h2>
          @if (imp.donations.length) {
            <ul class="mt-4 grid gap-3">
              @for (d of imp.donations; track d.id) {
                <li
                  class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5"
                >
                  <div>
                    <p class="font-semibold text-ink">{{ d.campaignTitle ?? 'Donation' }}</p>
                    <p class="text-sm text-slate2">{{ d.createdAt | date: 'mediumDate' }}</p>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="font-semibold text-ink">{{ d.amountCents | money }}</span>
                    <button
                      type="button"
                      (click)="viewReceipt(d.id)"
                      [disabled]="receiptLoadingId() === d.id"
                      class="rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist disabled:opacity-50"
                    >
                      {{ receiptLoadingId() === d.id ? 'Loading…' : 'View receipt' }}
                    </button>
                  </div>
                </li>
              }
            </ul>
            @if (receiptError()) {
              <p class="mt-3 text-sm font-medium text-brand-orange">{{ receiptError() }}</p>
            }
          } @else {
            <p class="mt-3 text-slate2">No receipts yet.</p>
          }
        </div>

        <!-- Call to action -->
        <div class="mt-10 rounded-2xl bg-brand-green/5 p-6 ring-1 ring-brand-green/20">
          <h2 class="font-display text-xl font-semibold text-ink">Browse campaigns to pledge</h2>
          <p class="mt-1 max-w-2xl text-slate2">
            Corporate pledges are made on a campaign page via SEPA bank transfer. Pick a student to
            support, commit your company's pledge, and it will appear here with a downloadable
            receipt.
          </p>
          <a
            routerLink="/campaigns"
            class="mt-4 inline-block rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            Browse campaigns
          </a>
        </div>
      }
    </section>

    @if (receipt(); as r) {
      <app-receipt-panel [receipt]="r" (close)="closeReceipt()" />
    }
  `,
})
export class SponsorPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly impact = signal<SponsorImpact | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly needsProfile = signal(false);

  readonly savingProfile = signal(false);
  readonly profileError = signal<string | null>(null);

  readonly receipt = signal<Receipt | null>(null);
  readonly receiptLoadingId = signal<string | null>(null);
  readonly receiptError = signal<string | null>(null);

  readonly esg = signal<EsgDashboard | null>(null);

  ngOnInit(): void {
    this.loadImpact();
  }

  loadImpact(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.sponsorImpact().subscribe({
      next: (impact) => {
        this.impact.set(impact);
        this.needsProfile.set(false);
        this.loading.set(false);
        this.loadEsg();
      },
      error: (err) => {
        const notFound = err?.status === 404 || err?.error?.error?.code === 'NOT_FOUND';
        if (notFound) {
          // No corporate profile yet — guide the sponsor to set one up.
          this.impact.set(null);
          this.needsProfile.set(true);
          this.error.set(null);
        } else {
          this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        }
        this.loading.set(false);
      },
    });
  }

  saveProfile(body: CompanyProfileInput): void {
    this.savingProfile.set(true);
    this.profileError.set(null);
    this.api.upsertCompany(body).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.loadImpact();
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.profileError.set(err?.error?.error?.message ?? 'Could not save your company profile');
      },
    });
  }

  viewReceipt(donationId: string): void {
    this.receiptError.set(null);
    this.receiptLoadingId.set(donationId);
    this.api.receipt(donationId).subscribe({
      next: (receipt) => {
        this.receipt.set(receipt);
        this.receiptLoadingId.set(null);
      },
      error: (err) => {
        this.receiptLoadingId.set(null);
        this.receiptError.set(err?.error?.error?.message ?? 'Could not load this receipt');
      },
    });
  }

  closeReceipt(): void {
    this.receipt.set(null);
    this.receiptError.set(null);
  }

  loadEsg(): void {
    this.api.esgDashboard().subscribe({
      next: (e) => this.esg.set(e),
      error: () => this.esg.set(null),
    });
  }

  exportEsg(format: 'csv' | 'pdf'): void {
    this.api.esgExport(format).subscribe({
      next: (blob) => this.downloadBlob(blob, `bursa-esg-report.${format}`),
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
}
