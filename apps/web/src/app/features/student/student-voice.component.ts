import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { charsRemaining, moderationHint, validateVoiceDraft } from './voice-message.helpers';

/**
 * Lets a student send a short thank-you message to their donors (E17). Text
 * plus optional video/voice URLs (no upload). The message is moderated on the
 * backend (reusing the E9 filter); approved messages reach the donors' feed and
 * their opted-in messengers (mocked). Money is never on this path.
 */
@Component({
  selector: 'app-student-voice',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mt-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h3 class="font-display text-lg font-semibold text-ink">Send a thank-you message</h3>
      <p class="mt-1 text-sm text-slate2">
        A short note to your supporters. Add a video or voice link if you like. Messages are
        moderated before they go out.
      </p>

      @if (resultHint()) {
        <p
          class="mt-3 rounded-lg px-3 py-2 text-sm"
          [class]="
            approved()
              ? 'bg-brand-green/10 text-brand-green'
              : 'bg-brand-orange/10 text-brand-orange'
          "
        >
          {{ resultHint() }}
        </p>
      }

      <form class="mt-4 space-y-3" (ngSubmit)="submit()">
        <textarea
          name="text"
          rows="3"
          [(ngModel)]="text"
          maxlength="600"
          placeholder="Thank you for supporting my MBA journey…"
          class="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        ></textarea>
        <p class="text-right text-xs text-slate2">{{ remaining() }} characters left</p>

        <input
          name="videoUrl"
          type="url"
          [(ngModel)]="videoUrl"
          placeholder="Video link (optional, e.g. a 30s clip URL)"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
        <input
          name="voiceUrl"
          type="url"
          [(ngModel)]="voiceUrl"
          placeholder="Voice note link (optional)"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        />

        @if (errorMsg()) {
          <p class="rounded-lg bg-brand-orange/10 px-3 py-2 text-sm text-brand-orange">
            {{ errorMsg() }}
          </p>
        }

        <button
          type="submit"
          [disabled]="submitting()"
          class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          @if (submitting()) {
            Sending…
          } @else {
            Send to supporters
          }
        </button>
      </form>
    </div>
  `,
})
export class StudentVoiceComponent {
  private readonly api = inject(ApiService);

  readonly campaignId = input.required<string>();

  text = '';
  videoUrl = '';
  voiceUrl = '';

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly resultHint = signal<string | null>(null);
  readonly approved = signal(false);

  remaining(): number {
    return charsRemaining(this.text);
  }

  submit(): void {
    if (this.submitting()) return;
    const draft = {
      text: this.text.trim(),
      videoUrl: this.videoUrl.trim() || undefined,
      voiceUrl: this.voiceUrl.trim() || undefined,
    };
    const validation = validateVoiceDraft(draft);
    if (!validation.valid) {
      this.errorMsg.set(validation.errors[0]);
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set(null);
    this.resultHint.set(null);

    this.api.submitStudentVoice(this.campaignId(), draft).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.approved.set(res.status === 'APPROVED');
        this.resultHint.set(moderationHint(res.reasons));
        if (res.status === 'APPROVED') {
          this.text = '';
          this.videoUrl = '';
          this.voiceUrl = '';
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? 'Could not send your message');
      },
    });
  }
}
