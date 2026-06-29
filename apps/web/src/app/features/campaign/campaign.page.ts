import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { campaignViewEvent } from '../../core/funnel-events';
import { CampaignDetail, CorporateSponsorshipResult, DonationResult } from '../../core/models';
import { VerifiedBadgeComponent } from '../../shared/verified-badge.component';
import { CorporateSponsorBoxComponent } from '../corporate/corporate-sponsor-box.component';
import { RecognitionBannerComponent } from '../corporate/recognition-banner.component';
import { CampaignFlagComponent } from './campaign-flag.component';
import { CampaignProgressComponent } from './campaign-progress.component';
import { CampaignVideoComponent } from './campaign-video.component';
import { DonateCardComponent, DonationSuccess } from './donate-card.component';
import { PayoutProofComponent } from './payout-proof.component';
import { RecentDonorsComponent } from './recent-donors.component';
import { ShareToolkitComponent } from './share-toolkit.component';
import { TrustPanelComponent } from './trust-panel.component';
import { UpdatesTimelineComponent } from './updates-timeline.component';

@Component({
  selector: 'app-campaign-page',
  standalone: true,
  imports: [
    RouterLink,
    VerifiedBadgeComponent,
    DonateCardComponent,
    CampaignProgressComponent,
    CampaignVideoComponent,
    ShareToolkitComponent,
    CorporateSponsorBoxComponent,
    RecognitionBannerComponent,
    UpdatesTimelineComponent,
    RecentDonorsComponent,
    TrustPanelComponent,
    PayoutProofComponent,
    CampaignFlagComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      @if (loading()) {
        <div class="space-y-6">
          <div class="h-64 w-full animate-pulse rounded-2xl bg-slate-100"></div>
          <div class="h-6 w-1/2 animate-pulse rounded bg-slate-100"></div>
          <div class="h-32 w-full animate-pulse rounded-2xl bg-slate-100"></div>
        </div>
      } @else if (error()) {
        <div
          class="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-black/5"
        >
          <h1 class="font-display text-xl font-semibold text-ink">Campaign not found</h1>
          <p class="mt-2 text-sm text-slate2">{{ error() }}</p>
          <a
            routerLink="/campaigns"
            class="mt-5 inline-block rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            Browse campaigns
          </a>
        </div>
      } @else if (detail(); as c) {
        <a
          routerLink="/campaigns"
          class="inline-flex items-center gap-1 text-sm text-slate2 hover:text-ink"
        >
          <span aria-hidden="true">←</span> Back to campaigns
        </a>

        <div class="mt-4 grid gap-8 lg:grid-cols-3">
          <!-- LEFT / MAIN -->
          <div class="space-y-8 lg:col-span-2">
            <div
              class="relative h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green/20 to-brand-blue/20 sm:h-80"
            >
              @if (c.photoUrl) {
                <img [src]="c.photoUrl" [alt]="c.studentName" class="h-full w-full object-cover" />
              } @else {
                <div
                  class="flex h-full w-full items-center justify-center text-6xl font-bold text-brand-green"
                >
                  {{ initials(c.studentName) }}
                </div>
              }
              @if (c.status === 'FUNDED' || c.status === 'DISBURSED') {
                <span
                  class="absolute left-4 top-4 rounded-full bg-brand-green px-3 py-1 text-xs font-semibold text-white"
                >
                  {{ c.status === 'DISBURSED' ? 'Disbursed' : 'Funded' }}
                </span>
              }
            </div>

            <div class="space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-medium text-slate2">
                  {{ c.studentName }} · {{ c.studentCountry }}
                </p>
                <app-verified-badge [verified]="c.verified" />
              </div>

              <h1 class="font-display text-3xl font-semibold leading-tight text-ink">
                {{ c.title }}
              </h1>

              <p class="text-sm text-slate2">{{ c.programName }} · {{ c.school.name }}</p>
            </div>

            @if (c.videoUrl) {
              <app-campaign-video [videoUrl]="c.videoUrl" />
            }

            <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
              <h2 class="font-display text-lg font-semibold text-ink">The story</h2>
              <p class="mt-3 whitespace-pre-line leading-relaxed text-ink">{{ c.story }}</p>

              @if (c.recommendation) {
                <blockquote class="mt-6 rounded-xl border-l-4 border-brand-green bg-mist px-5 py-4">
                  <p class="whitespace-pre-line italic text-ink">“{{ c.recommendation }}”</p>
                  <footer class="mt-2 text-sm font-medium text-slate2">— Recommendation</footer>
                </blockquote>
              }
            </div>

            @if (c.updates.length) {
              <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
                <h2 class="mb-5 font-display text-lg font-semibold text-ink">Updates</h2>
                <app-updates-timeline [updates]="c.updates" />
              </div>
            }

            <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
              <h2 class="font-display text-lg font-semibold text-ink">Recent supporters</h2>
              <div class="mt-2">
                <app-recent-donors [donations]="c.recentDonations" />
              </div>
            </div>
          </div>

          <!-- RIGHT / STICKY -->
          <div class="lg:col-span-1">
            <div class="space-y-6 lg:sticky lg:top-6">
              <app-campaign-progress
                [raisedCents]="c.raisedCents"
                [goalCents]="c.goalCents"
                [currency]="c.currency"
                [status]="c.status"
                [deadline]="c.deadline ?? null"
              />
              <p class="px-1 text-sm text-slate2">
                {{ c.donorCount }} supporter{{ c.donorCount === 1 ? '' : 's' }}
              </p>

              <app-payout-proof [proof]="c.payoutProof ?? null" />

              <app-trust-panel [trust]="c.trust" />

              @if (c.recognition?.length) {
                <app-recognition-banner [recognition]="c.recognition ?? []" />
              }

              <app-donate-card [campaignId]="c.id" (donated)="onDonated($event)" />

              @if (auth.role() === 'SPONSOR') {
                <app-corporate-sponsor-box
                  [campaignId]="c.id"
                  [goalCents]="c.goalCents"
                  [raisedCents]="c.raisedCents"
                  (sponsored)="onSponsored($event)"
                />
              }

              <app-share-toolkit
                [campaignId]="c.id"
                [title]="c.title"
                [studentName]="c.studentName"
                [firstBackers]="c.donorCount < 3"
                [heading]="c.donorCount < 3 ? 'Be the first to back ' + c.studentName : 'Share this campaign'"
                [subtext]="
                  c.donorCount < 3
                    ? 'A few early backers create the momentum that pulls in strangers.'
                    : ''
                "
              />

              <div class="px-1">
                <app-campaign-flag [campaignId]="c.id" />
              </div>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class CampaignPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  private readonly analytics = inject(AnalyticsService);

  readonly detail = signal<CampaignDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No campaign was specified.');
      this.loading.set(false);
      return;
    }

    this.analytics.track(campaignViewEvent(id));
    this.api.campaign(id).subscribe({
      next: (campaign) => {
        this.detail.set(campaign);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'This campaign could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  onDonated(event: DonationSuccess): void {
    this.applyResult(event.result);
    this.detail.update((d) =>
      d
        ? {
            ...d,
            donorCount: d.donorCount + 1,
            recentDonations: [event.optimistic, ...d.recentDonations].slice(0, 12),
          }
        : d,
    );
  }

  onSponsored(result: CorporateSponsorshipResult): void {
    this.applyResult(result);
    this.detail.update((d) => {
      if (!d) return d;
      const sp = result.sponsorship;
      const recognition =
        sp.recognitionKind !== 'ANONYMOUS'
          ? [
              {
                companyName: 'Your company',
                logoUrl: null,
                scholarshipName: sp.scholarshipName ?? null,
              },
              ...(d.recognition ?? []),
            ]
          : d.recognition;
      return { ...d, donorCount: d.donorCount + 1, recognition };
    });
  }

  private applyResult(result: DonationResult | CorporateSponsorshipResult): void {
    this.detail.update((d) =>
      d
        ? {
            ...d,
            status: result.campaign.status,
            goalCents: result.campaign.goalCents,
            raisedCents: result.campaign.raisedCents,
            tipsCents: result.campaign.tipsCents,
            currency: result.campaign.currency,
            percent: result.campaign.percent,
          }
        : d,
    );
  }

  initials(name: string): string {
    return (name || '?')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
