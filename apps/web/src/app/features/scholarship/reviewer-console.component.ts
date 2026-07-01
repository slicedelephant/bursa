import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationRow } from '../../core/models';
import { applicationStatusLabel } from './status-format';

export interface RubricFieldRef {
  fieldKey: string;
  label: string;
}

export interface ScoreSubmission {
  applicationId: string;
  scores: { fieldKey: string; score: number }[];
}

/**
 * E19 — reviewer console: score each rubric field (0-5) for an application.
 * Presentational; the page owns the reviewer identity + API call.
 */
@Component({
  selector: 'app-reviewer-console',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-ink">{{ application.applicantName }}</h3>
        <span class="text-xs text-slate2">{{ statusLabel(application.status) }}</span>
      </div>
      <p class="mt-1 text-sm text-slate2">Consensus so far: {{ application.consensusScore }}/100</p>
      @if (rubricFields.length === 0) {
        <p class="mt-3 text-sm text-slate2">This form has no scored fields.</p>
      } @else {
        <div class="mt-4 space-y-3">
          @for (f of rubricFields; track f.fieldKey) {
            <label class="flex items-center justify-between gap-4">
              <span class="text-sm text-ink">{{ f.label }}</span>
              <input
                type="number"
                min="0"
                max="5"
                class="w-16 rounded-lg border border-mist px-2 py-1 text-sm"
                [(ngModel)]="values[f.fieldKey]"
                [name]="f.fieldKey"
              />
            </label>
          }
        </div>
        <button
          type="button"
          class="mt-4 rounded-lg bg-brand-green px-3 py-2 text-sm text-white"
          (click)="submit()"
        >
          Submit scores
        </button>
      }
    </div>
  `,
})
export class ReviewerConsoleComponent {
  @Input({ required: true }) application!: ApplicationRow;
  @Input() rubricFields: RubricFieldRef[] = [];
  @Output() scored = new EventEmitter<ScoreSubmission>();

  values: Record<string, number> = {};
  statusLabel = applicationStatusLabel;

  submit(): void {
    const scores = this.rubricFields.map((f) => ({
      fieldKey: f.fieldKey,
      score: Number(this.values[f.fieldKey] ?? 0),
    }));
    this.scored.emit({ applicationId: this.application.id, scores });
  }
}
