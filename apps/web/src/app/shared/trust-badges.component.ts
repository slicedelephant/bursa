import { Component, Input } from '@angular/core';
import { CampaignTrust } from '../core/models';

interface TrustBadge {
  readonly label: string;
  readonly tooltip: string;
}

/**
 * Reusable trust-signal badges (identity checked, admission verified, school
 * confirmed). Renders one green pill per active signal, each with an explanatory
 * tooltip. Inactive signals are simply omitted.
 */
@Component({
  selector: 'app-trust-badges',
  standalone: true,
  template: `
    @if (badges.length) {
      <ul class="flex flex-wrap gap-2">
        @for (badge of badges; track badge.label) {
          <li
            class="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold text-brand-green"
            [title]="badge.tooltip"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                clip-rule="evenodd"
              />
            </svg>
            {{ badge.label }}
          </li>
        }
      </ul>
    }
  `,
})
export class TrustBadgesComponent {
  @Input({ required: true }) trust!: CampaignTrust;

  get badges(): TrustBadge[] {
    const t = this.trust;
    const all: ReadonlyArray<readonly [boolean, string, string]> = [
      [t.identityChecked, 'Identity checked', 'The student’s identity has been checked by Bursa.'],
      [
        t.admissionVerified,
        'Admission verified',
        'An admin verified the school admission for this campaign.',
      ],
      [
        t.schoolConfirmed,
        'School confirmed',
        'The receiving school is a confirmed, payout-verified institution.',
      ],
    ];
    return all.filter(([active]) => active).map(([, label, tooltip]) => ({ label, tooltip }));
  }
}
