import { Component, computed, input, output } from '@angular/core';
import { DonorReferralView } from '../../core/models';
import { copyText, displayLink } from './referral-link';
import {
  bothWinText,
  conversionText,
  nextTierText,
  perkText,
  rewardTierLabel,
  trackingTiles,
} from './referral-stats-format';
import { referralShareLinks } from './share-templates';

/**
 * Donor referral panel (E15): the donor's link, the invited/donated/active tracking,
 * the recognition reward (no cash), one-tap share buttons, and an opt-in toggle for
 * the anonymous leaderboard. Reuses the E3 share toolkit for the channel deeplinks.
 */
@Component({
  selector: 'app-referral-panel',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-slate2">Invite friends</p>
          <h3 class="mt-1 font-display text-base font-semibold text-ink">Your referral link</h3>
        </div>
        <span
          class="inline-flex items-center rounded-full bg-brand-green/10 px-3 py-1.5 text-sm font-semibold text-brand-green"
        >
          {{ tierLabel() }}
        </span>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <code
          class="flex-1 truncate rounded-xl bg-mist px-3 py-2.5 text-sm text-ink"
          data-testid="referral-link"
          >{{ shortLink() }}</code
        >
        <button
          type="button"
          (click)="copy()"
          class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink hover:bg-mist"
        >
          {{ copied() ? 'Copied!' : 'Copy' }}
        </button>
      </div>

      <div class="mt-4 grid grid-cols-3 gap-3">
        @for (tile of tiles(); track tile.label) {
          <div class="rounded-xl bg-mist p-3 text-center">
            <p class="font-display text-xl font-bold text-ink">{{ tile.value }}</p>
            <p class="text-xs text-slate2">{{ tile.label }}</p>
          </div>
        }
      </div>

      <p class="mt-3 text-sm text-slate2">{{ conversion() }}</p>
      <p class="mt-1 text-sm font-medium text-ink">{{ perk() }}</p>
      <p class="mt-1 text-xs text-slate2">{{ nextTier() }}</p>
      <p class="mt-1 text-xs text-brand-green">{{ bothWin() }}</p>

      <div class="mt-4 flex flex-wrap gap-2">
        @for (link of channels(); track link.channel) {
          <a
            [href]="link.href"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-ink hover:bg-mist"
            >{{ link.label }}</a
          >
        }
      </div>

      <label class="mt-4 flex items-center gap-2 text-sm text-slate2">
        <input
          type="checkbox"
          [checked]="view().optInLeaderboard"
          (change)="toggleOptIn($event)"
          data-testid="opt-in"
        />
        Show me on the anonymous referral leaderboard
      </label>
    </div>
  `,
})
export class ReferralPanelComponent {
  readonly view = input.required<DonorReferralView>();
  readonly copied = input<boolean>(false);
  readonly copyRequested = output<string>();
  readonly optInChanged = output<boolean>();

  readonly shortLink = computed(() => displayLink(this.view().link.shareUrl));
  readonly tiles = computed(() => trackingTiles(this.view().stats));
  readonly channels = computed(() =>
    referralShareLinks(this.view().link.shareUrl, 'a friend', this.view().templates),
  );

  tierLabel(): string {
    return rewardTierLabel(this.view().reward);
  }
  conversion(): string {
    return conversionText(this.view().stats);
  }
  perk(): string {
    return perkText(this.view().reward);
  }
  nextTier(): string {
    return nextTierText(this.view().reward);
  }
  bothWin(): string {
    return bothWinText(this.view().reward);
  }

  copy(): void {
    this.copyRequested.emit(copyText(this.view().link.shareUrl));
  }

  toggleOptIn(event: Event): void {
    this.optInChanged.emit((event.target as HTMLInputElement).checked);
  }
}
