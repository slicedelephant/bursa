import { Component, input, output } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { RecurringPledge } from '../../core/models';

/** Presentational list of simulated monthly pledges with lifecycle controls. */
@Component({
  selector: 'app-recurring-list',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-lg font-semibold text-ink">Monthly giving</h2>
        @if (hasActive()) {
          <button
            type="button"
            (click)="run.emit()"
            class="rounded-lg border border-brand-green px-3 py-1.5 text-xs font-semibold text-brand-green hover:bg-brand-green/5"
          >
            Simulate next charge
          </button>
        }
      </div>
      <p class="mt-1 text-xs text-slate2">
        Recurring giving is simulated in this prototype — no real card is charged.
      </p>

      @if (pledges().length === 0) {
        <p class="mt-4 text-sm text-slate2">
          You have no monthly gifts yet. Turn on "Make this monthly" when you donate to sponsor a
          student over time.
        </p>
      } @else {
        <ul class="mt-4 space-y-3">
          @for (p of pledges(); track p.id) {
            <li class="rounded-xl border border-slate-100 p-4">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p class="font-medium text-ink">{{ p.campaign?.title || 'Campaign' }}</p>
                  <p class="text-xs text-slate2">
                    {{ p.amountCents | money: true }} / month · {{ p.chargesCount }} charge{{
                      p.chargesCount === 1 ? '' : 's'
                    }}
                    · {{ p.totalChargedCents | money: true }} total
                  </p>
                </div>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" [class]="badge(p)">{{
                  p.status
                }}</span>
              </div>

              <div class="mt-3 flex gap-2">
                @if (p.status === 'ACTIVE') {
                  <button
                    type="button"
                    (click)="pause.emit(p.id)"
                    class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-mist"
                  >
                    Pause
                  </button>
                }
                @if (p.status === 'PAUSED') {
                  <button
                    type="button"
                    (click)="resume.emit(p.id)"
                    class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-mist"
                  >
                    Resume
                  </button>
                }
                @if (p.status !== 'CANCELLED') {
                  <button
                    type="button"
                    (click)="cancel.emit(p.id)"
                    class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-brand-orange hover:bg-mist"
                  >
                    Cancel
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class RecurringListComponent {
  readonly pledges = input.required<RecurringPledge[]>();
  readonly pause = output<string>();
  readonly resume = output<string>();
  readonly cancel = output<string>();
  readonly run = output<void>();

  hasActive(): boolean {
    return this.pledges().some((p) => p.status === 'ACTIVE');
  }

  badge(p: RecurringPledge): string {
    switch (p.status) {
      case 'ACTIVE':
        return 'bg-brand-green/10 text-brand-green';
      case 'PAUSED':
        return 'bg-brand-blue/10 text-brand-blue';
      default:
        return 'bg-slate-100 text-slate2';
    }
  }
}
