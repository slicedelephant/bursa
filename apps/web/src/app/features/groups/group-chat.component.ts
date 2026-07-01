import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GroupChatView } from '../../core/models';

/** Presentational moderated group chat: the approved message history plus a
 * compose box. Posting is a moderated request/response (no live socket) — the
 * parent moderates + persists, and surfaces a rejection reason back here. */
@Component({
  selector: 'app-group-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h3 class="font-display text-lg font-semibold text-ink">Group chat</h3>
      <p class="mt-1 text-xs text-slate2">Messages are moderated before they appear.</p>

      <ul class="mt-4 space-y-3">
        @for (message of view().messages; track message.createdAt) {
          <li class="rounded-xl bg-mist/50 p-3">
            <p class="text-xs font-semibold text-ink">{{ message.name }}</p>
            <p class="mt-0.5 text-sm text-slate2">{{ message.text }}</p>
          </li>
        } @empty {
          <li class="text-sm text-slate2">No messages yet — say hello!</li>
        }
      </ul>

      @if (canPost()) {
        <form class="mt-4 flex items-center gap-2" (ngSubmit)="submit()">
          <input
            type="text"
            [(ngModel)]="draft"
            name="message"
            maxlength="500"
            placeholder="Write a message…"
            class="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm"
          />
          <button
            type="submit"
            class="shrink-0 rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Send
          </button>
        </form>
        @if (rejection()) {
          <p class="mt-2 text-xs text-brand-orange">{{ rejection() }}</p>
        }
      }
    </div>
  `,
})
export class GroupChatComponent {
  readonly view = input.required<GroupChatView>();
  readonly canPost = input<boolean>(false);
  /** A rejection reason surfaced by the parent after a moderated post. */
  readonly rejection = input<string>('');
  readonly post = output<string>();

  readonly draft = signal('');

  submit(): void {
    const text = this.draft().trim();
    if (text.length === 0) return;
    this.post.emit(text);
    this.draft.set('');
  }
}
