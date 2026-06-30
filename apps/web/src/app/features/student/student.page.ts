import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AdvocateDashboardView, StudentMe } from '../../core/models';
import { AdvocateManagerComponent } from '../referral/advocate-manager.component';
import { CampaignWizardComponent } from './campaign-wizard.component';
import { StudentCampaignStatus } from './campaign-status.component';
import { ImpactUpdateFormComponent } from './impact-update-form.component';
import { KycVerificationComponent } from './kyc-verification.component';
import { StudentProfileForm } from './profile-form.component';
import { StudentVoiceComponent } from './student-voice.component';

/** Student dashboard: profile → campaign → status state machine driven by `studentMe()`. */
@Component({
  selector: 'app-student-page',
  standalone: true,
  imports: [
    StudentProfileForm,
    CampaignWizardComponent,
    StudentCampaignStatus,
    ImpactUpdateFormComponent,
    KycVerificationComponent,
    AdvocateManagerComponent,
    StudentVoiceComponent,
  ],
  template: `
    <section class="mx-auto max-w-2xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">Student dashboard</p>
        <h1 class="font-display text-3xl font-bold text-ink">Hi {{ userName() }}</h1>
        <p class="mt-1 text-slate2">
          Set up your profile, launch your campaign, and track your funding.
        </p>
      </header>

      @if (!loading() && !error() && me()) {
        <ol class="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label="Progress">
          @for (item of steps; track item.n) {
            <li class="flex items-center gap-2">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                [class]="stepBadgeClass(item.n)"
              >
                @if (step() > item.n) {
                  ✓
                } @else {
                  {{ item.n }}
                }
              </span>
              <span
                [class.text-ink]="step() >= item.n"
                [class.font-semibold]="step() === item.n"
                class="text-slate2"
              >
                {{ item.label }}
              </span>
              @if (!$last) {
                <span class="ml-1 hidden h-px w-6 bg-slate-200 sm:inline-block"></span>
              }
            </li>
          }
        </ol>
      }

      @if (loading()) {
        <div class="animate-pulse rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <div class="h-6 w-1/2 rounded bg-slate-100"></div>
          <div class="mt-4 h-4 w-3/4 rounded bg-slate-100"></div>
          <div class="mt-6 h-32 rounded bg-slate-100"></div>
        </div>
      } @else if (error()) {
        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <p class="text-sm font-medium text-brand-orange" role="alert">{{ error() }}</p>
          <button
            type="button"
            (click)="load()"
            class="mt-4 rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist"
          >
            Try again
          </button>
        </div>
      } @else if (me(); as data) {
        @if (!data.profile) {
          <app-student-profile-form (saved)="load()" />
        } @else if (!data.campaign) {
          <div class="mb-6">
            <app-kyc-verification />
          </div>
          <app-student-campaign-wizard (saved)="load()" />
        } @else {
          <app-student-campaign-status
            [campaign]="data.campaign"
            [studentName]="data.profile.fullName"
            (changed)="load()"
          />
          @if (isLive(data.campaign.status)) {
            <app-impact-update-form [campaignId]="data.campaign.id" />
            <app-student-voice [campaignId]="data.campaign.id" />
            @if (advocates(); as adv) {
              <div class="mt-6">
                <app-advocate-manager
                  [view]="adv"
                  (invite)="inviteAdvocate(data.campaign.id, $event)"
                />
              </div>
            }
          }
        }
      }
    </section>
  `,
})
export class StudentPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly me = signal<StudentMe | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly advocates = signal<AdvocateDashboardView | null>(null);

  readonly steps = [
    { n: 1, label: 'Profile' },
    { n: 2, label: 'Campaign' },
    { n: 3, label: 'Funding' },
  ];

  readonly userName = computed(() => this.auth.user()?.displayName ?? 'there');

  readonly step = computed(() => {
    const data = this.me();
    if (!data || !data.profile) return 1;
    if (!data.campaign) return 2;
    return 3;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.studentMe().subscribe({
      next: (data) => {
        this.me.set(data);
        this.loading.set(false);
        if (data.campaign && this.isLive(data.campaign.status)) {
          this.reloadAdvocates(data.campaign.id);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
      },
    });
  }

  private reloadAdvocates(campaignId: string): void {
    this.api.campaignAdvocates(campaignId).subscribe({
      next: (view) => this.advocates.set(view),
    });
  }

  inviteAdvocate(campaignId: string, body: { name: string; email?: string }): void {
    this.api.inviteAdvocate(campaignId, body).subscribe({
      next: () => this.reloadAdvocates(campaignId),
    });
  }

  stepBadgeClass(n: number): string {
    const current = this.step();
    if (current > n) return 'bg-brand-green text-white';
    if (current === n) return 'bg-brand-green text-white ring-4 ring-brand-green/15';
    return 'bg-slate-100 text-slate2';
  }

  isLive(status: string): boolean {
    return status === 'LIVE' || status === 'FUNDED' || status === 'DISBURSED';
  }
}
