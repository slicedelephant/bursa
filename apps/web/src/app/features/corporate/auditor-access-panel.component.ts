import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditorGrant, CreatedAuditorGrant } from '../../core/models';
import { canRevoke, hoursUntilExpiry, statusChipClass, statusLabel } from './auditor-grant-format';

/**
 * Auditor access management: a small create form, the list of grants with status
 * chips, and the one-time portal link for a freshly created grant. Presentational —
 * create/revoke are delegated to the parent (auth-aware api calls).
 */
@Component({
  selector: 'app-auditor-access-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-xl font-semibold text-ink">Auditor access</h2>
      <p class="text-sm text-slate2">
        Issue a time-limited, read-only audit-trail link for an external auditor.
      </p>

      <div class="mt-4 flex flex-wrap items-end gap-3">
        <label class="flex-1">
          <span class="block text-xs font-medium text-slate2">Label</span>
          <input
            [(ngModel)]="label"
            type="text"
            placeholder="e.g. PwC Q1 audit"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span class="block text-xs font-medium text-slate2">TTL (hours)</span>
          <input
            [(ngModel)]="ttlHours"
            type="number"
            min="1"
            max="168"
            class="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          (click)="emitCreate()"
          [disabled]="!label.trim()"
          class="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Create grant
        </button>
      </div>

      @if (created) {
        <div class="mt-4 rounded-lg bg-emerald-50 p-4 text-sm">
          <p class="font-medium text-emerald-800">
            Grant created — copy this read-only link now (shown once):
          </p>
          <code class="mt-1 block break-all text-emerald-700">{{ created.portalUrl }}</code>
        </div>
      }

      @if (grants.length) {
        <ul class="mt-5 divide-y divide-slate-100">
          @for (g of grants; track g.id) {
            <li class="flex items-center justify-between gap-3 py-3">
              <div>
                <p class="text-sm font-medium text-ink">{{ g.label }}</p>
                <p class="text-xs text-slate2">
                  expires in {{ hours(g.expiresAt) }}h
                  @if (g.lastUsedAt) {
                    · used
                  }
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" [class]="chip(g.status)">
                  {{ status(g.status) }}
                </span>
                @if (revokable(g)) {
                  <button
                    type="button"
                    (click)="revoke.emit(g.id)"
                    class="text-xs font-medium text-brand-orange hover:underline"
                  >
                    Revoke
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="mt-5 text-sm text-slate2">No auditor grants yet.</p>
      }
    </div>
  `,
})
export class AuditorAccessPanelComponent {
  @Input() grants: AuditorGrant[] = [];
  @Input() created: CreatedAuditorGrant | null = null;
  @Output() create = new EventEmitter<{ label: string; ttlHours: number }>();
  @Output() revoke = new EventEmitter<string>();

  label = '';
  ttlHours = 48;

  status = statusLabel;
  chip = statusChipClass;
  revokable = canRevoke;
  hours = (expiresAt: string) => hoursUntilExpiry(expiresAt);

  emitCreate(): void {
    const label = this.label.trim();
    if (!label) return;
    this.create.emit({ label, ttlHours: this.ttlHours });
  }
}
