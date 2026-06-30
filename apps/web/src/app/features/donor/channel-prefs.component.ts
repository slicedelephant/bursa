import { Component, computed, input, output } from '@angular/core';
import { ChannelPrefsView, ChannelPrefView } from '../../core/models';
import { channelMeta, channelStatusText } from './channel-pref-format';

/** Presentational channel-preferences panel: opt-in toggles for the diaspora
 * channels (WhatsApp/Telegram/Messenger), email digest and push. IN_APP is
 * always on. Emits the changed preference for the parent to persist. */
@Component({
  selector: 'app-channel-prefs',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">Where to reach you</h2>
      <p class="mt-1 text-sm text-slate2">
        Get impact updates on the channels you actually use. In-app is always on; opt into the rest.
      </p>

      <ul class="mt-4 space-y-3">
        @for (pref of prefs(); track pref.channel) {
          <li
            class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink">
                <span aria-hidden="true">{{ meta(pref).icon }}</span> {{ meta(pref).label }}
              </p>
              <p class="mt-0.5 text-xs text-slate2">{{ meta(pref).description }}</p>
            </div>
            @if (meta(pref).locked) {
              <span class="shrink-0 text-xs font-medium text-slate2">{{ status(pref) }}</span>
            } @else {
              <button
                type="button"
                (click)="toggle(pref)"
                [attr.aria-pressed]="pref.optIn"
                class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                [class]="pref.optIn ? 'bg-brand-green text-white' : 'bg-slate-100 text-slate2'"
              >
                {{ status(pref) }}
              </button>
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class ChannelPrefsComponent {
  readonly view = input.required<ChannelPrefsView>();
  readonly changed = output<ChannelPrefView>();

  readonly prefs = computed(() => this.view().prefs);

  meta(pref: ChannelPrefView) {
    return channelMeta(pref.channel);
  }

  status(pref: ChannelPrefView): string {
    return channelStatusText(pref.channel, pref.optIn);
  }

  toggle(pref: ChannelPrefView): void {
    this.changed.emit({ ...pref, optIn: !pref.optIn });
  }
}
