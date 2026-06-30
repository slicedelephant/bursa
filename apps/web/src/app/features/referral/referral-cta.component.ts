import { Component, computed, input, output } from '@angular/core';
import { displayLink } from './referral-link';

/**
 * Referral call-to-action (E15): shown after a successful donation and in the E16
 * portfolio. Nudges the donor to share their referral link so a friend can give too —
 * recognition only, never cash.
 */
@Component({
  selector: 'app-referral-cta',
  standalone: true,
  template: `
    <div
      class="rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-blue/10 p-5 ring-1 ring-black/5"
    >
      <p class="font-display text-base font-semibold text-ink">{{ heading() }}</p>
      <p class="mt-1 text-sm text-slate2">
        Friends referred by you are far more likely to give. Share your link and you both earn a
        supporter badge.
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <code class="truncate rounded-xl bg-white px-3 py-2 text-sm text-ink">{{
          shortLink()
        }}</code>
        <button
          type="button"
          (click)="share.emit()"
          class="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          data-testid="cta-share"
        >
          Share my link
        </button>
      </div>
    </div>
  `,
})
export class ReferralCtaComponent {
  readonly shareUrl = input.required<string>();
  readonly heading = input<string>('Help another student — invite a friend');
  readonly share = output<void>();

  readonly shortLink = computed(() => displayLink(this.shareUrl()));
}
