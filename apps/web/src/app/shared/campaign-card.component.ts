import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoneyPipe } from '../core/money.pipe';
import { CampaignCard } from '../core/models';
import { ProgressBarComponent } from './progress-bar.component';
import { VerifiedBadgeComponent } from './verified-badge.component';

@Component({
  selector: 'app-campaign-card',
  standalone: true,
  imports: [RouterLink, MoneyPipe, ProgressBarComponent, VerifiedBadgeComponent],
  template: `
    <a
      [routerLink]="['/campaigns', campaign.id]"
      class="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div class="relative h-44 overflow-hidden bg-gradient-to-br from-brand-green/20 to-brand-blue/20">
        @if (campaign.photoUrl) {
          <img
            [src]="campaign.photoUrl"
            [alt]="campaign.studentName"
            class="h-full w-full object-cover transition group-hover:scale-105"
          />
        } @else {
          <div class="flex h-full w-full items-center justify-center text-4xl font-bold text-brand-green">
            {{ initials }}
          </div>
        }
        @if (campaign.status === 'FUNDED' || campaign.status === 'DISBURSED') {
          <span
            class="absolute left-3 top-3 rounded-full bg-brand-green px-2.5 py-1 text-xs font-semibold text-white"
          >
            {{ campaign.status === 'DISBURSED' ? 'Disbursed' : 'Funded' }}
          </span>
        }
      </div>

      <div class="flex flex-1 flex-col gap-3 p-5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-slate2">
            {{ campaign.studentName }} · {{ campaign.studentCountry }}
          </p>
          <app-verified-badge [verified]="campaign.verified" />
        </div>

        <h3 class="font-display text-lg font-semibold leading-snug text-ink">
          {{ campaign.title }}
        </h3>

        <p class="text-sm text-slate2">
          {{ campaign.programName }} · {{ campaign.schoolName }}
        </p>

        <div class="mt-auto space-y-2 pt-2">
          <app-progress-bar [percent]="campaign.percent" />
          <div class="flex items-baseline justify-between text-sm">
            <span class="font-semibold text-ink">{{ campaign.raisedCents | money }} raised</span>
            <span class="text-slate2">of {{ campaign.goalCents | money }}</span>
          </div>
        </div>
      </div>
    </a>
  `,
})
export class CampaignCardComponent {
  @Input({ required: true }) campaign!: CampaignCard;

  get initials(): string {
    return (this.campaign.studentName || '?')
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
