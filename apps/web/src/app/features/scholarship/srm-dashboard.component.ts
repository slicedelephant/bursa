import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { ScholarEvent, ScholarRow } from '../../core/models';
import { nextScholarEvent, scholarStatusBadge, scholarStatusLabel } from './status-format';

/**
 * E19 — SRM dashboard: scholar list with status advance + a message action.
 * Presentational (inputs/outputs only); the page wires the ApiService.
 */
@Component({
  selector: 'app-srm-dashboard',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h3 class="text-lg font-semibold text-ink">Scholar relationships</h3>
      @if (scholars.length === 0) {
        <p class="mt-2 text-sm text-slate2">No scholars yet — award someone first.</p>
      } @else {
        <ul class="mt-4 space-y-3">
          @for (s of scholars; track s.id) {
            <li class="flex items-center justify-between gap-4 rounded-xl bg-mist/40 p-3">
              <div>
                <p class="font-medium text-ink">{{ s.fullName }}</p>
                <p class="text-xs text-slate2">
                  {{ s.amountCents | money }} · tranche {{ s.trancheStatus }}
                  @if (s.alumniNetwork) {
                    · <span class="text-brand-green">alumni</span>
                  }
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full px-2 py-1 text-xs {{ badge(s.status) }}">
                  {{ label(s.status) }}
                </span>
                @if (next(s); as n) {
                  <button
                    type="button"
                    class="rounded-lg bg-brand-blue px-2 py-1 text-xs text-white"
                    (click)="advance.emit({ scholarId: s.id, event: n.event })"
                  >
                    {{ n.label }}
                  </button>
                }
                <button
                  type="button"
                  class="rounded-lg bg-ink px-2 py-1 text-xs text-white"
                  (click)="message.emit(s.id)"
                >
                  Message
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class SrmDashboardComponent {
  @Input() scholars: ScholarRow[] = [];
  @Output() advance = new EventEmitter<{ scholarId: string; event: ScholarEvent }>();
  @Output() message = new EventEmitter<string>();

  label = scholarStatusLabel;
  badge = scholarStatusBadge;
  next = (s: ScholarRow) => nextScholarEvent(s.status);
}
