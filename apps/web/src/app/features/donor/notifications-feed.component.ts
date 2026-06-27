import { Component, computed, input, output } from '@angular/core';
import { DonorNotification, NotificationFeed } from '../../core/models';
import { relativeTime } from '../campaign/relative-time';
import { notificationStyle } from './notification-format';

/** Presentational impact/notification feed. Emits a notification id to mark read. */
@Component({
  selector: 'app-notifications-feed',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg font-semibold text-ink">Your impact feed</h2>
        @if (feed().unread > 0) {
          <span class="rounded-full bg-brand-orange px-2.5 py-0.5 text-xs font-semibold text-white">
            {{ feed().unread }} new
          </span>
        }
      </div>

      @if (items().length === 0) {
        <p class="mt-4 text-sm text-slate2">
          No updates yet. Once you support a student, their progress and thank-you notes show up
          here.
        </p>
      } @else {
        <ul class="mt-4 space-y-3">
          @for (n of items(); track n.id) {
            <li
              class="flex gap-3 rounded-xl border border-slate-100 p-3"
              [class.bg-mist]="!n.readAt"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                [class]="style(n).accent"
                [attr.aria-label]="style(n).label"
                >{{ style(n).icon }}</span
              >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-ink">{{ n.title }}</p>
                <p class="mt-0.5 text-sm text-slate2">{{ n.body }}</p>
                <div class="mt-1 flex items-center gap-3">
                  <span class="text-xs text-slate2">{{ when(n) }}</span>
                  @if (!n.readAt) {
                    <button
                      type="button"
                      (click)="read.emit(n.id)"
                      class="text-xs font-medium text-brand-green hover:underline"
                    >
                      Mark as read
                    </button>
                  }
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class NotificationsFeedComponent {
  readonly feed = input.required<NotificationFeed>();
  readonly read = output<string>();

  readonly items = computed(() => this.feed().items);

  style(n: DonorNotification) {
    return notificationStyle(n.type);
  }

  when(n: DonorNotification): string {
    return relativeTime(n.createdAt);
  }
}
