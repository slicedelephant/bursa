import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicationRow } from '../../core/models';
import { applicationStatusLabel } from './status-format';

/**
 * E19 — award management: rank applications by consensus, trigger the award
 * decision, and (per awarded application) disburse to the school. Presentational;
 * disbursement/tranche wiring lives in the page + ApiService.
 */
@Component({
  selector: 'app-award-management',
  standalone: true,
  imports: [],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-ink">Applications &amp; awards</h3>
        <button
          type="button"
          class="rounded-lg bg-brand-green px-3 py-2 text-sm text-white"
          (click)="decide.emit()"
        >
          Decide winners
        </button>
      </div>
      <p class="mt-1 text-xs text-slate2">
        Awards disburse to the verified school, never to the scholar.
      </p>
      @if (applications.length === 0) {
        <p class="mt-3 text-sm text-slate2">No applications yet.</p>
      } @else {
        <ul class="mt-4 space-y-2">
          @for (a of ranked(); track a.id) {
            <li class="flex items-center justify-between gap-4 rounded-xl bg-mist/40 p-3">
              <div>
                <p class="font-medium text-ink">{{ a.applicantName }}</p>
                <p class="text-xs text-slate2">
                  {{ statusLabel(a.status) }} · {{ a.consensusScore }}/100
                </p>
              </div>
              @if (a.awarded) {
                <span class="rounded-full bg-brand-green/10 px-2 py-1 text-xs text-brand-green">
                  Awarded
                </span>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class AwardManagementComponent {
  @Input() applications: ApplicationRow[] = [];
  @Output() decide = new EventEmitter<void>();

  statusLabel = applicationStatusLabel;

  /** Applications sorted by consensus score desc (new array, no mutation). */
  ranked(): ApplicationRow[] {
    return [...this.applications].sort((a, b) => b.consensusScore - a.consensusScore);
  }
}
