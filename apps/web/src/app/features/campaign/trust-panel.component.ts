import { Component, Input } from '@angular/core';
import { CampaignTrust } from '../../core/models';
import { TrustBadgesComponent } from '../../shared/trust-badges.component';

/**
 * Trust block shown directly above the donate CTA: verification badges, the
 * direct-to-school promise and a short fund-flow explainer
 * (Donor -> Bursa (nonprofit) -> School).
 */
@Component({
  selector: 'app-trust-panel',
  standalone: true,
  imports: [TrustBadgesComponent],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Why you can trust this campaign</h2>

      <div class="mt-4">
        <app-trust-badges [trust]="trust" />
      </div>

      <p class="mt-4 text-sm font-semibold text-ink">
        Bursa pays the school directly, never the student.
      </p>

      <div class="mt-3">
        <p class="text-xs font-medium uppercase tracking-wide text-slate2">How the money flows</p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span class="rounded-lg bg-mist px-2.5 py-1 text-ink">Donor</span>
          <span class="text-slate2" aria-hidden="true">&rarr;</span>
          <span class="rounded-lg bg-brand-green/10 px-2.5 py-1 text-brand-green">
            Bursa <span class="font-normal">(nonprofit)</span>
          </span>
          <span class="text-slate2" aria-hidden="true">&rarr;</span>
          <span class="rounded-lg bg-mist px-2.5 py-1 text-ink">School</span>
        </div>
      </div>
    </div>
  `,
})
export class TrustPanelComponent {
  @Input({ required: true }) trust!: CampaignTrust;
}
