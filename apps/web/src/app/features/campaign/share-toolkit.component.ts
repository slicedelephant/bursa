import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import {
  ShareInput,
  ShareLang,
  buildShareLinks,
  campaignUrl,
  originOf,
  shareMessage,
} from './share-links';

/**
 * One-tap, mobile-first share toolkit. Pre-written WhatsApp/Telegram/Facebook
 * deeplinks (EN/DE) plus copy-link, so a student can seed the first backers from
 * their own network in a single thumb tap. All link logic lives in `share-links`.
 */
@Component({
  selector: 'app-share-toolkit',
  standalone: true,
  template: `
    <div class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
      <div class="flex items-start justify-between gap-3">
        <h3 class="font-display text-base font-semibold text-ink">{{ heading() }}</h3>
        <div class="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 text-xs">
          @for (l of langs; track l) {
            <button
              type="button"
              (click)="setLang(l)"
              class="px-2 py-1 font-semibold uppercase"
              [class.bg-brand-green]="lang() === l"
              [class.text-white]="lang() === l"
              [class.text-slate2]="lang() !== l"
            >
              {{ l }}
            </button>
          }
        </div>
      </div>

      @if (subtext()) {
        <p class="mt-1 text-sm text-slate2">{{ subtext() }}</p>
      }

      <p class="mt-3 rounded-lg bg-mist px-3 py-2 text-xs italic text-slate2">{{ message() }}</p>

      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a
          [href]="links().whatsapp"
          target="_blank"
          rel="noopener"
          aria-label="Share on WhatsApp"
          class="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          WhatsApp
        </a>
        <a
          [href]="links().telegram"
          target="_blank"
          rel="noopener"
          aria-label="Share on Telegram"
          class="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Telegram
        </a>
        <a
          [href]="links().facebook"
          target="_blank"
          rel="noopener"
          aria-label="Share on Facebook"
          class="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Facebook
        </a>
        <button
          type="button"
          (click)="copy()"
          aria-label="Copy link"
          class="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink hover:bg-mist"
        >
          {{ copied() ? 'Copied!' : 'Copy link' }}
        </button>
      </div>
    </div>
  `,
})
export class ShareToolkitComponent {
  readonly campaignId = input.required<string>();
  readonly title = input.required<string>();
  readonly studentName = input.required<string>();
  /** Inner-circle framing for the "be one of the first backers" nudge. */
  readonly firstBackers = input<boolean>(false);
  readonly heading = input<string>('Share this campaign');
  readonly subtext = input<string>('');

  private readonly doc = inject(DOCUMENT);

  readonly langs: ShareLang[] = ['en', 'de'];
  readonly lang = signal<ShareLang>('en');
  readonly copied = signal(false);

  private readonly url = computed(() => campaignUrl(this.origin(), this.campaignId()));

  private readonly shareInput = computed<ShareInput>(() => ({
    url: this.url(),
    studentName: this.studentName(),
    title: this.title(),
    lang: this.lang(),
    firstBackers: this.firstBackers(),
  }));

  readonly links = computed(() => buildShareLinks(this.shareInput()));
  readonly message = computed(() => shareMessage(this.shareInput()));

  setLang(l: ShareLang): void {
    this.lang.set(l);
  }

  async copy(): Promise<void> {
    const text = `${shareMessage(this.shareInput())} ${this.url()}`;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently ignore.
    }
  }

  private origin(): string {
    return originOf(this.doc.location);
  }
}
