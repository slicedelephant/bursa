import { Component, Input } from '@angular/core';
import { CampaignRecognition } from '../../core/models';

/**
 * Public corporate recognition on the campaign page: named scholarships and
 * company logos for non-anonymous sponsorships. Renders nothing when empty.
 */
@Component({
  selector: 'app-recognition-banner',
  standalone: true,
  imports: [],
  template: `
    @if (recognition.length) {
      <div class="rounded-2xl bg-brand-blue/5 p-5 ring-1 ring-brand-blue/20">
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-blue">
          Corporate supporters
        </p>
        <ul class="mt-3 space-y-3">
          @for (r of recognition; track $index) {
            <li class="flex items-center gap-3">
              @if (r.logoUrl) {
                <img
                  [src]="r.logoUrl"
                  [alt]="r.companyName"
                  class="h-9 w-9 rounded object-contain ring-1 ring-black/5"
                />
              } @else {
                <span
                  class="flex h-9 w-9 items-center justify-center rounded bg-brand-blue/10 text-xs font-bold text-brand-blue"
                >
                  {{ initials(r.companyName) }}
                </span>
              }
              <div>
                @if (r.scholarshipName) {
                  <p class="font-semibold text-ink">{{ r.scholarshipName }}</p>
                }
                <p class="text-sm text-slate2">Supported by {{ r.companyName }}</p>
              </div>
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class RecognitionBannerComponent {
  @Input() recognition: CampaignRecognition[] = [];

  initials(name: string): string {
    return (name || '?')
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
