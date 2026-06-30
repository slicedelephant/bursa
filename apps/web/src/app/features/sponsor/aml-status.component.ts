import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { VerificationCaseView } from '../../core/models';
import { amlNextStep, amlStatusClass, amlStatusLabel } from './aml-status';

/**
 * Sponsor AML-status surface (E11). Runs a compliance screening for a high-value
 * contribution behind the swappable AML provider (Mock by default) and shows the
 * outcome (cleared / flagged / blocked). It never moves money — money still
 * flows only to the school; this is a compliance gate, not a payment step.
 */
@Component({
  selector: 'app-aml-status',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Compliance check</h2>
      <p class="mt-1 text-sm text-slate2">
        Contributions above EUR 5,000 / month run a quick AML screening. Run a demo check below.
      </p>

      @if (error()) {
        <p class="mt-3 text-sm text-brand-orange">{{ error() }}</p>
      }

      @if (result(); as r) {
        <div class="mt-4">
          <span class="rounded-full px-3 py-1 text-sm ring-1" [class]="statusClass(r)">
            {{ statusLabel(r) }}
          </span>
          <p class="mt-2 text-sm text-slate2">{{ nextStep(r) }}</p>
        </div>
      }

      <button
        type="button"
        (click)="runDemo()"
        [disabled]="busy()"
        class="mt-4 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Run demo screening
      </button>
    </div>
  `,
})
export class AmlStatusComponent {
  private readonly api = inject(ApiService);

  readonly result = signal<VerificationCaseView | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  statusLabel(view: VerificationCaseView): string {
    return amlStatusLabel(view.aml?.decision ?? 'CLEAR');
  }

  statusClass(view: VerificationCaseView): string {
    return amlStatusClass(view.aml?.decision ?? 'CLEAR');
  }

  nextStep(view: VerificationCaseView): string {
    return amlNextStep(view.status);
  }

  runDemo(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.kycScreenAml({ amountCents: 600000, country: 'DE' }).subscribe({
      next: (view) => {
        this.result.set(view);
        this.busy.set(false);
      },
      error: () => {
        this.error.set('The contribution was blocked by the compliance check.');
        this.busy.set(false);
      },
    });
  }
}
