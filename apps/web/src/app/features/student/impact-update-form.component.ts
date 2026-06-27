import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

/**
 * Lets a student post an impact update. Posting fans the update out to every
 * subscribed donor (in-app + logged email) on the backend.
 */
@Component({
  selector: 'app-impact-update-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mt-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h3 class="font-display text-lg font-semibold text-ink">Post an update</h3>
      <p class="mt-1 text-sm text-slate2">
        Keep your supporters in the loop — everyone who backed you gets notified.
      </p>

      @if (posted()) {
        <p class="mt-3 rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
          Update posted — your supporters have been notified.
        </p>
      }

      <form class="mt-4 space-y-3" (ngSubmit)="submit()">
        <input
          name="title"
          type="text"
          [(ngModel)]="title"
          maxlength="120"
          placeholder="Title (e.g. Semester 1 started)"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
        <textarea
          name="body"
          rows="3"
          [(ngModel)]="body"
          placeholder="What's the latest?"
          class="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        ></textarea>

        @if (errorMsg()) {
          <p class="rounded-lg bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange">
            {{ errorMsg() }}
          </p>
        }

        <button
          type="submit"
          [disabled]="!canSubmit() || submitting()"
          class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          @if (submitting()) {
            Posting…
          } @else {
            Post update
          }
        </button>
      </form>
    </div>
  `,
})
export class ImpactUpdateFormComponent {
  private readonly api = inject(ApiService);

  readonly campaignId = input.required<string>();
  readonly postedChange = output<void>();

  title = '';
  body = '';

  readonly submitting = signal(false);
  readonly posted = signal(false);
  readonly errorMsg = signal<string | null>(null);

  canSubmit(): boolean {
    return this.title.trim().length > 0 && this.body.trim().length > 0;
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);
    this.errorMsg.set(null);
    this.posted.set(false);

    this.api
      .postUpdate(this.campaignId(), {
        title: this.title.trim(),
        body: this.body.trim(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.posted.set(true);
          this.title = '';
          this.body = '';
          this.postedChange.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set(err?.error?.error?.message ?? 'Could not post update');
        },
      });
  }
}
