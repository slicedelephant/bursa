import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SchoolPortalProfile } from '../../core/models';
import { SchoolCampaignApprovalComponent } from './campaign-approval.component';
import {
  checklistProgressPct,
  onboardingStatusClass,
  onboardingStatusLabel,
} from './onboarding-progress';
import { SchoolPayoutFormComponent } from './payout-form.component';
import { SchoolDashboardComponent } from './school-dashboard.component';
import { SchoolStudentListComponent } from './student-list.component';
import { SchoolWebhooksPanelComponent } from './webhooks-panel.component';

type SchoolTab = 'dashboard' | 'students' | 'campaigns' | 'payout' | 'webhooks';

/** Branded school-admin portal shell: per-school header, onboarding banner, tabs. */
@Component({
  selector: 'app-school-page',
  standalone: true,
  imports: [
    RouterLink,
    SchoolDashboardComponent,
    SchoolStudentListComponent,
    SchoolCampaignApprovalComponent,
    SchoolPayoutFormComponent,
    SchoolWebhooksPanelComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          @if (profile()?.school?.logoUrl; as logo) {
            <img [src]="logo" alt="" class="h-10 w-10 rounded-lg object-contain ring-1 ring-black/5" />
          } @else {
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 font-display text-lg font-semibold text-brand-green">
              {{ initials() }}
            </div>
          }
          <div>
            <h1 class="font-display text-2xl font-semibold text-ink">
              {{ profile()?.school?.name ?? 'School portal' }}
            </h1>
            <p class="text-xs text-slate2">School portal · powered by Bursa</p>
          </div>
        </div>
        <a routerLink="/campaigns" class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist">
          Public gallery
        </a>
      </header>

      @if (profile(); as p) {
        <div class="mb-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-ink">Onboarding</span>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1" [class]="statusCls(p.onboarding.status)">
                {{ statusLabel(p.onboarding.status) }}
              </span>
            </div>
            <span class="text-sm text-slate2">{{ progress(p) }}% complete</span>
          </div>
          <div class="mt-3 h-2 w-full rounded-full bg-mist">
            <div class="h-2 rounded-full bg-brand-green" [style.width.%]="progress(p)"></div>
          </div>
          <ul class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            @for (step of p.onboarding.checklist; track step.key) {
              <li [class]="step.done ? 'text-brand-green' : 'text-slate2'">
                {{ step.done ? '✓' : '○' }} {{ step.label }}
              </li>
            }
          </ul>
        </div>
      }

      <div class="mb-6 inline-flex flex-wrap rounded-xl bg-mist p-1 ring-1 ring-black/5" role="tablist">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="selectedTab() === tab.id"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition"
            [class]="selectedTab() === tab.id ? 'bg-white text-ink shadow-card' : 'text-slate2 hover:text-ink'"
            (click)="selectedTab.set(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @switch (selectedTab()) {
        @case ('dashboard') {
          <app-school-dashboard />
        }
        @case ('students') {
          <app-school-student-list (changed)="load()" />
        }
        @case ('campaigns') {
          <app-school-campaign-approval />
        }
        @case ('payout') {
          <app-school-payout-form (changed)="load()" />
        }
        @case ('webhooks') {
          <app-school-webhooks-panel />
        }
      }
    </section>
  `,
})
export class SchoolPage {
  private readonly api = inject(ApiService);

  readonly profile = signal<SchoolPortalProfile | null>(null);
  readonly selectedTab = signal<SchoolTab>('dashboard');

  readonly tabs: { id: SchoolTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'students', label: 'Students' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'payout', label: 'Payout & agreement' },
    { id: 'webhooks', label: 'Webhooks' },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.api.schoolMe().subscribe({ next: (p) => this.profile.set(p) });
  }

  initials(): string {
    const name = this.profile()?.school?.name ?? 'S';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  progress(p: SchoolPortalProfile): number {
    return checklistProgressPct(p.onboarding.checklist);
  }

  statusLabel(status: SchoolPortalProfile['onboarding']['status']): string {
    return onboardingStatusLabel(status);
  }

  statusCls(status: SchoolPortalProfile['onboarding']['status']): string {
    return onboardingStatusClass(status);
  }
}
