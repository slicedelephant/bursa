import { Component, computed, input, output } from '@angular/core';
import { FeedItem, FeedView } from '../../core/models';
import { feedCtaLabel, feedKindStyle, feedRelativeTime, hasMedia } from './feed-card-format';
import { readStreakText } from './read-streak-format';

/** Presentational, mobile-first impact feed: a horizontally swipeable row of
 * student story cards. Emits a feed-item key to mark it read. */
@Component({
  selector: 'app-impact-feed',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg font-semibold text-ink">Your impact feed</h2>
        @if (view().unreadCount > 0) {
          <span class="rounded-full bg-brand-orange px-2.5 py-0.5 text-xs font-semibold text-white">
            {{ view().unreadCount }} new
          </span>
        }
      </div>
      <p class="mt-1 text-xs text-slate2">{{ streakLabel() }}</p>

      @if (items().length === 0) {
        <p class="mt-4 text-sm text-slate2">
          No updates yet. Once you support a student, their milestones and thank-you messages show
          up here.
        </p>
      } @else {
        <div
          class="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          role="list"
          aria-label="Impact feed"
        >
          @for (item of items(); track item.key) {
            <article
              role="listitem"
              class="flex w-72 shrink-0 snap-start flex-col rounded-2xl border border-slate-100 p-4"
              [class.bg-mist]="!item.read"
            >
              @if (item.photoUrl) {
                <img
                  [src]="item.photoUrl"
                  [alt]="item.title"
                  class="mb-3 h-32 w-full rounded-xl object-cover"
                />
              }
              <div class="flex items-center gap-2">
                <span
                  class="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                  [class]="style(item).accent"
                  [attr.aria-label]="style(item).label"
                  >{{ style(item).icon }}</span
                >
                <span class="text-xs font-medium text-slate2">{{ style(item).label }}</span>
                @if (media(item)) {
                  <span class="text-xs text-brand-green">▶ media</span>
                }
              </div>
              <p class="mt-2 text-sm font-semibold text-ink">{{ item.title }}</p>
              <p class="mt-1 line-clamp-4 text-sm text-slate2">{{ item.body }}</p>
              <div class="mt-auto flex items-center justify-between pt-3">
                <span class="text-xs text-slate2">{{ when(item) }}</span>
                @if (!item.read) {
                  <button
                    type="button"
                    (click)="read.emit(item.key)"
                    class="text-xs font-medium text-brand-green hover:underline"
                  >
                    Mark as read
                  </button>
                } @else {
                  <span class="text-xs text-slate2">Read</span>
                }
              </div>
              <a
                [href]="item.ctaUrl"
                class="mt-2 text-xs font-medium text-brand-blue hover:underline"
                >{{ cta(item) }}</a
              >
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class ImpactFeedComponent {
  readonly view = input.required<FeedView>();
  readonly read = output<string>();

  readonly items = computed(() => this.view().items);

  streakLabel(): string {
    return readStreakText(this.view().readStreak);
  }

  style(item: FeedItem) {
    return feedKindStyle(item.kind);
  }

  media(item: FeedItem): boolean {
    return hasMedia(item);
  }

  cta(item: FeedItem): string {
    return feedCtaLabel(item);
  }

  when(item: FeedItem): string {
    return feedRelativeTime(item.createdAt);
  }
}
