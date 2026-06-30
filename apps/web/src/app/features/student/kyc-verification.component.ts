import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { VerificationCaseView } from '../../core/models';
import {
  canRunDocument,
  canRunLiveness,
  isCaseTerminal,
  kycProgressPercent,
  kycStatusClass,
  kycStatusLabel,
} from './kyc-status';

/**
 * Student identity verification flow (E11). Starts a verification case, then
 * runs the liveness (video-selfie) and document (diploma upload) steps behind
 * the swappable identity provider (Mock by default). It surfaces the case status
 * and routes exceptions to the operator review queue server-side — it never
 * touches the money path. The demo tokens drive the deterministic mock:
 * a token ending in `-FAIL` / `-MISMATCH` exercises the failure paths.
 */
@Component({
  selector: 'app-kyc-verification',
  standalone: true,
  template: `
    <div class="rounded-xl border border-brand-green/30 bg-brand-green/5 p-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-display text-sm font-semibold text-ink">Identity verification</h3>
        @if (current()) {
          <span class="rounded-full px-2 py-0.5 text-xs ring-1" [class]="statusClass()">
            {{ statusLabel() }}
          </span>
        }
      </div>
      <p class="mt-1 text-xs text-slate2">
        Verify your identity so your campaign can go live without a manual wait. A video selfie and
        your diploma are checked automatically; anything unclear goes to a human reviewer.
      </p>

      @if (error()) {
        <p class="mt-2 text-xs text-brand-orange">{{ error() }}</p>
      }

      <div class="mt-3 h-2 w-full rounded-full bg-mist">
        <div class="h-2 rounded-full bg-brand-green" [style.width]="progressWidth()"></div>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        @if (!current()) {
          <button type="button" (click)="start()" [disabled]="busy()" [class]="btn">
            Start verification
          </button>
        } @else {
          <button
            type="button"
            (click)="runLiveness()"
            [disabled]="busy() || !livenessAvailable()"
            [class]="btn"
          >
            Run liveness check
          </button>
          <button
            type="button"
            (click)="runDocument()"
            [disabled]="busy() || !documentAvailable()"
            [class]="btn"
          >
            Verify diploma
          </button>
        }
      </div>

      @if (terminal()) {
        <p class="mt-2 text-xs text-slate2">This case is complete. {{ statusLabel() }}.</p>
      }
    </div>
  `,
})
export class KycVerificationComponent {
  private readonly api = inject(ApiService);

  readonly btn =
    'rounded-lg bg-brand-green px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50';

  readonly current = signal<VerificationCaseView | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  statusLabel(): string {
    const c = this.current();
    return c ? kycStatusLabel(c.status) : '';
  }

  statusClass(): string {
    const c = this.current();
    return c ? kycStatusClass(c.status) : '';
  }

  progressWidth(): string {
    const c = this.current();
    return `${c ? kycProgressPercent(c.status) : 0}%`;
  }

  livenessAvailable(): boolean {
    const c = this.current();
    return !!c && canRunLiveness(c.status);
  }

  documentAvailable(): boolean {
    const c = this.current();
    return !!c && canRunDocument(c.status);
  }

  terminal(): boolean {
    const c = this.current();
    return !!c && isCaseTerminal(c.status);
  }

  start(): void {
    this.run(this.api.kycStartCase({}));
  }

  runLiveness(): void {
    const c = this.current();
    if (!c) return;
    this.run(this.api.kycLiveness(c.id, { livenessToken: 'live_demo_ok' }));
  }

  runDocument(): void {
    const c = this.current();
    if (!c) return;
    this.run(
      this.api.kycDocument(c.id, {
        documentToken: 'doc_demo_ok',
        claimedName: 'My Name',
      }),
    );
  }

  private run(obs: ReturnType<ApiService['kycStartCase']>): void {
    this.busy.set(true);
    this.error.set(null);
    obs.subscribe({
      next: (view) => {
        this.current.set(view);
        this.busy.set(false);
      },
      error: () => {
        this.error.set('Verification step failed. Please try again.');
        this.busy.set(false);
      },
    });
  }
}
