import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChargebackItem } from '../../../core/models';
import { chargebackStatusClass, chargebackStatusLabel, refundEligible } from './chargeback-format';
import { formatEur } from './risk-format';

export interface EvidenceEvent {
  id: string;
  note: string;
}

/**
 * Chargeback queue (ADMIN). Fed by (mocked) Stripe dispute webhooks. The
 * operator can attach evidence and, for low-value open disputes, trigger an
 * auto-refund offer (a status only — no real money moves). Presentational.
 */
@Component({
  selector: 'app-chargeback-queue',
  standalone: true,
  template: `
    @if (!chargebacks.length) {
      <p class="rounded-xl bg-white p-5 text-sm text-slate2 ring-1 ring-black/5">No chargebacks.</p>
    } @else {
      <div class="space-y-3">
        @for (c of chargebacks; track c.id) {
          <div class="rounded-xl bg-white p-4 ring-1 ring-black/5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-medium text-ink">{{ eur(c.amountCents) }} · {{ c.reason }}</p>
                <p class="text-xs text-slate2">
                  {{ c.providerEventId }}
                  @if (c.campaignId) {
                    · campaign {{ c.campaignId }}
                  }
                </p>
              </div>
              <span class="rounded-full px-2 py-0.5 text-xs ring-1" [class]="statusClass(c.status)">
                {{ statusLabel(c.status) }}
              </span>
            </div>

            @if (c.evidenceNote) {
              <p class="mt-2 text-xs text-slate2">Evidence: {{ c.evidenceNote }}</p>
            }

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <input
                #note
                type="text"
                placeholder="Evidence note"
                class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                [disabled]="c.status !== 'OPEN'"
                (click)="submitEvidence.emit({ id: c.id, note: note.value })"
              >
                Submit evidence
              </button>
              <button
                type="button"
                class="rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                [disabled]="!canRefund(c)"
                (click)="offerRefund.emit(c.id)"
              >
                Offer refund
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ChargebackQueueComponent {
  @Input() chargebacks: ChargebackItem[] = [];
  @Output() submitEvidence = new EventEmitter<EvidenceEvent>();
  @Output() offerRefund = new EventEmitter<string>();

  readonly eur = formatEur;
  readonly statusLabel = chargebackStatusLabel;
  readonly statusClass = chargebackStatusClass;

  canRefund(c: ChargebackItem): boolean {
    return refundEligible(c.status, c.amountCents);
  }
}
