import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ModerationAction,
  ModerationCaseItem,
} from '../../../core/models';
import {
  moderationStatusClass,
  moderationStatusLabel,
  reasonLabels,
} from './moderation-format';
import { riskLevelClass, riskLevelLabel, scoreBarWidth } from './risk-format';

export interface ModerationDecisionEvent {
  id: string;
  action: ModerationAction;
  note: string;
}

/**
 * Moderation queue table (ADMIN). Sorted by risk score upstream. Each open case
 * can be approved / rejected / escalated with a mandatory reason. Presentational
 * — it emits decisions; the page performs the API call.
 */
@Component({
  selector: 'app-moderation-queue',
  standalone: true,
  template: `
    @if (!cases.length) {
      <p class="rounded-xl bg-white p-5 text-sm text-slate2 ring-1 ring-black/5">
        The moderation queue is empty.
      </p>
    } @else {
      <div class="space-y-3">
        @for (c of cases; track c.id) {
          <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-medium text-ink">{{ c.campaignTitle || c.campaignId }}</p>
                <div class="mt-1 flex items-center gap-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs ring-1"
                    [class]="statusClass(c.status)"
                  >
                    {{ statusLabel(c.status) }}
                  </span>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs ring-1"
                    [class]="riskClass(c.riskLevel)"
                  >
                    {{ riskLabel(c.riskLevel) }} · {{ c.riskScore }}
                  </span>
                  @if (c.autoFlagged) {
                    <span class="text-xs text-brand-orange">auto-flagged</span>
                  }
                  @if (c.campaignFrozen) {
                    <span class="text-xs text-brand-orange">frozen</span>
                  }
                </div>
              </div>
              <div class="h-2 w-28 self-center rounded-full bg-mist">
                <div
                  class="h-2 rounded-full bg-brand-orange"
                  [style.width]="barWidth(c.riskScore)"
                ></div>
              </div>
            </div>

            <ul class="mt-2 flex flex-wrap gap-1.5">
              @for (r of reasons(c.reasons); track r) {
                <li class="rounded bg-mist px-2 py-0.5 text-xs text-slate2">{{ r }}</li>
              }
            </ul>

            @if (c.status === 'OPEN') {
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <input
                  #note
                  type="text"
                  placeholder="Reason (required)"
                  class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  class="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-medium text-white"
                  (click)="emit(c.id, 'APPROVE', note.value)"
                >
                  Approve
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-brand-orange px-3 py-1.5 text-sm font-medium text-white"
                  (click)="emit(c.id, 'REJECT', note.value)"
                >
                  Reject &amp; freeze
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  (click)="emit(c.id, 'ESCALATE', note.value)"
                >
                  Escalate
                </button>
              </div>
            } @else if (c.decisionNote) {
              <p class="mt-2 text-xs text-slate2">Note: {{ c.decisionNote }}</p>
            }
          </div>
        }
      </div>
    }
  `,
})
export class ModerationQueueComponent {
  @Input() cases: ModerationCaseItem[] = [];
  @Output() decide = new EventEmitter<ModerationDecisionEvent>();

  readonly statusLabel = moderationStatusLabel;
  readonly statusClass = moderationStatusClass;
  readonly reasons = reasonLabels;
  readonly riskClass = riskLevelClass;
  readonly riskLabel = riskLevelLabel;
  readonly barWidth = scoreBarWidth;

  emit(id: string, action: ModerationAction, note: string): void {
    this.decide.emit({ id, action, note: note.trim() });
  }
}
