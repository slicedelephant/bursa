import { Component, input } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { MatchBalanceClaim } from '../../core/models';
import { statusTone } from './match-format';

/** Presentational employer-match claim history for the donor account. */
@Component({
  selector: 'app-claim-history',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Match claims</h2>

      @if (claims().length === 0) {
        <p class="mt-4 text-sm text-slate2">
          No employer match claims yet. Claimed matches commit extra funds to the campaigns you
          support — paid directly to the school.
        </p>
      } @else {
        <ul class="mt-4 divide-y divide-slate-100">
          @for (c of claims(); track c.id) {
            <li class="flex flex-wrap items-start justify-between gap-3 py-3">
              <div class="min-w-0">
                <p class="font-medium text-ink">{{ c.campaignTitle }}</p>
                <p class="text-xs text-slate2">{{ c.employerName }} · {{ c.schoolName }}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="font-semibold text-ink">{{ c.matchCents | money }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  [class.bg-brand-green]="tone(c) === 'green'"
                  [class.text-white]="tone(c) === 'green'"
                  [class.bg-brand-blue]="tone(c) === 'blue'"
                  [class.bg-brand-orange]="tone(c) === 'orange'"
                  [class.text-brand-orange]="tone(c) === 'orange'"
                  [class.bg-slate-100]="tone(c) === 'slate'"
                  [class.text-slate2]="tone(c) === 'slate'"
                  >{{ c.statusLabel }}</span
                >
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class ClaimHistoryComponent {
  readonly claims = input.required<MatchBalanceClaim[]>();

  tone(c: MatchBalanceClaim): string {
    return statusTone(c.status);
  }
}
