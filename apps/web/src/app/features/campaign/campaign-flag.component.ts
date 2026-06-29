import { Component, Input, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { FlagReason } from '../../core/models';

/**
 * Community flag button (E9). Lets any visitor report a suspicious campaign
 * (optionally anonymous). Posts to the public, rate-limited flag endpoint. Keeps
 * Bursa's trust loop open to the crowd without forcing a login.
 */
@Component({
  selector: 'app-campaign-flag',
  standalone: true,
  template: `
    @if (done()) {
      <p class="rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
        Thanks — this campaign has been reported to our Trust &amp; Safety team.
      </p>
    } @else if (open()) {
      <div class="rounded-xl border border-slate-200 p-3">
        <label class="block text-xs font-medium text-slate2">Reason</label>
        <select
          #reason
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="SCAM">Looks like a scam</option>
          <option value="DUPLICATE">Duplicate campaign</option>
          <option value="INAPPROPRIATE">Inappropriate content</option>
          <option value="MISLEADING">Misleading claims</option>
          <option value="OTHER">Other</option>
        </select>
        <textarea
          #note
          rows="2"
          placeholder="What looks wrong? (optional)"
          class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        ></textarea>
        @if (error()) {
          <p class="mt-1 text-xs text-brand-orange">{{ error() }}</p>
        }
        <div class="mt-2 flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-brand-orange px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            [disabled]="submitting()"
            (click)="submit(reason.value, note.value)"
          >
            Submit report
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            (click)="open.set(false)"
          >
            Cancel
          </button>
        </div>
      </div>
    } @else {
      <button
        type="button"
        class="text-sm text-slate2 underline underline-offset-2 hover:text-brand-orange"
        (click)="open.set(true)"
      >
        Report this campaign
      </button>
    }
  `,
})
export class CampaignFlagComponent {
  @Input({ required: true }) campaignId!: string;

  private readonly api = inject(ApiService);

  readonly open = signal(false);
  readonly done = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  submit(reason: string, note: string): void {
    this.submitting.set(true);
    this.error.set(null);
    this.api
      .flagCampaign(this.campaignId, {
        reason: reason as FlagReason,
        note: note.trim() || undefined,
        visitorId: this.visitorId(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.done.set(true);
        },
        error: () => {
          this.submitting.set(false);
          this.error.set('Could not submit the report. Please try again later.');
        },
      });
  }

  private visitorId(): string {
    return `web-${Math.random().toString(36).slice(2, 10)}`;
  }
}
