import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VerificationCaseView } from '../../../core/models';
import {
  amlDecisionLabel,
  caseStatusLabel,
  reviewReason,
  riskLevelClass,
  riskLevelLabel,
  scoreBarWidth,
} from './kyc-review-format';

export interface KycReviewDecisionEvent {
  id: string;
  decision: 'APPROVE' | 'REJECT';
  note: string;
}

/**
 * KYC manual-review queue table (ADMIN). Sorted by risk score upstream. Each
 * pending case shows why it landed in review (failed liveness / name mismatch /
 * AML hit) and can be approved or rejected with a mandatory note. Presentational
 * — it emits decisions; the page performs the API call. It never touches money.
 */
@Component({
  selector: 'app-kyc-review-queue',
  standalone: true,
  template: `
    @if (!cases.length) {
      <p class="rounded-xl bg-white p-5 text-sm text-slate2 ring-1 ring-black/5">
        The review queue is empty.
      </p>
    } @else {
      <div class="space-y-3">
        @for (c of cases; track c.id) {
          <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-medium text-ink">{{ c.subjectType }} · {{ c.id }}</p>
                <div class="mt-1 flex items-center gap-2">
                  <span class="rounded-full px-2 py-0.5 text-xs ring-1 bg-mist text-slate2">
                    {{ statusLabel(c.status) }}
                  </span>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs ring-1"
                    [class]="riskClass(c.riskLevel)"
                  >
                    {{ riskLabel(c.riskLevel) }} · {{ c.riskScore }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate2">{{ reason(c) }}</p>
                @if (c.aml) {
                  <p class="mt-1 text-xs text-slate2">
                    AML: {{ amlLabel(c.aml.decision) }} ({{ c.aml.country }})
                  </p>
                }
              </div>
              <div class="h-2 w-28 self-center rounded-full bg-mist">
                <div
                  class="h-2 rounded-full bg-brand-orange"
                  [style.width]="barWidth(c.riskScore)"
                ></div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                [value]="noteFor(c.id)"
                (input)="setNote(c.id, $event)"
                placeholder="Decision note (required)"
                class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                (click)="emit(c.id, 'APPROVE')"
                class="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-medium text-white"
              >
                Approve
              </button>
              <button
                type="button"
                (click)="emit(c.id, 'REJECT')"
                class="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-medium text-white"
              >
                Reject
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class KycReviewQueueComponent {
  @Input() cases: VerificationCaseView[] = [];
  @Output() decided = new EventEmitter<KycReviewDecisionEvent>();

  private readonly notes = new Map<string, string>();

  noteFor(id: string): string {
    return this.notes.get(id) ?? '';
  }

  setNote(id: string, event: Event): void {
    this.notes.set(id, (event.target as HTMLInputElement).value);
  }

  emit(id: string, decision: 'APPROVE' | 'REJECT'): void {
    const note = this.noteFor(id).trim() || 'Reviewed by operator';
    this.decided.emit({ id, decision, note });
  }

  statusLabel = caseStatusLabel;
  riskLabel = riskLevelLabel;
  riskClass = riskLevelClass;
  amlLabel = amlDecisionLabel;
  barWidth = scoreBarWidth;

  reason(c: VerificationCaseView): string {
    return reviewReason({
      liveness: c.liveness,
      document: c.document,
      aml: c.aml,
    });
  }
}
