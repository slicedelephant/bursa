import { Component, computed, input } from '@angular/core';
import { InactivityView } from '../../core/models';
import { inactivityHeadline, lastGaveText } from './read-streak-format';

/** Presentational gentle inactivity reminder banner with a 1-tap donate CTA.
 * Renders nothing when no reminder is due. The CTA only links the existing
 * donate flow — money still goes to the school. */
@Component({
  selector: 'app-inactivity-reminder',
  standalone: true,
  template: `
    @if (show()) {
      <div
        class="rounded-2xl bg-gradient-to-br from-brand-orange/10 to-brand-green/10 p-5 shadow-card ring-1 ring-black/5"
      >
        <p class="text-xs uppercase tracking-wide text-brand-orange">We miss you</p>
        <p class="mt-1 font-display text-xl font-bold text-ink">{{ headline() }}</p>
        <p class="mt-1 text-sm text-slate2">{{ reminderBody() }}</p>
        <p class="mt-1 text-xs text-slate2">{{ lastGave() }}</p>
        <a
          [href]="ctaUrl()"
          class="mt-3 inline-flex items-center rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90"
        >
          Give again — one tap
        </a>
      </div>
    }
  `,
})
export class InactivityReminderComponent {
  readonly view = input.required<InactivityView>();

  readonly show = computed(() => this.view().shouldRemind && !!this.view().reminder);

  headline(): string {
    return inactivityHeadline(this.view());
  }

  reminderBody(): string {
    return this.view().reminder?.body ?? '';
  }

  ctaUrl(): string {
    return this.view().reminder?.ctaUrl ?? '#';
  }

  lastGave(): string {
    return lastGaveText(this.view());
  }
}
