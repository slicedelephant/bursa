import { Component, input } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { MatchBalance } from '../../core/models';
import { balanceLabel, usedPercent } from './match-format';

/**
 * Presentational employer-match balance counter for the donor account. Shows the
 * remaining annual match budget ("€800 match still available this year") and a
 * progress bar of the cap used so far.
 */
@Component({
  selector: 'app-match-balance',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Employer match</h2>

      @if (balance().employerName) {
        <p class="mt-1 text-sm text-slate2">
          Detected employer:
          <span class="font-medium text-ink">{{ balance().employerName }}</span>
        </p>
        <p class="mt-4 font-display text-2xl font-bold text-brand-green">{{ label() }}</p>
        <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-brand-green" [style.width.%]="percent()"></div>
        </div>
        <p class="mt-2 text-xs text-slate2">
          {{ balance().usedCents | money }} of {{ balance().annualCapCents | money }} matched in
          {{ balance().year }}
        </p>
      } @else {
        <p class="mt-4 text-sm text-slate2">
          No employer match detected yet. When you donate, check whether your employer doubles your
          gift — it's free money toward a student's tuition.
        </p>
      }
    </div>
  `,
})
export class MatchBalanceComponent {
  readonly balance = input.required<MatchBalance>();

  label(): string {
    return balanceLabel(this.balance());
  }

  percent(): number {
    return usedPercent(this.balance());
  }
}
