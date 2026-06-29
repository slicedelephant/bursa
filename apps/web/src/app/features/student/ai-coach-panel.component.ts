import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  AiShareChannel,
  AiStoryParts,
  AiStoryVariant,
  AiVariant,
  CoachLocale,
} from '../../core/models';
import {
  budgetExhausted,
  channelLabel,
  formatRemainingBudget,
  variantPreview,
} from './ai-coach.helpers';

/**
 * Assistive AI coach box embedded INSIDE the E3 campaign wizard (story step).
 * It never overwrites the student's text on its own — only a deliberate "Use
 * this" click applies a variant via the outputs. The manual flow stays intact.
 *
 * It reads the wizard's current draft values as inputs and emits the chosen
 * title / story parts back so the parent updates its existing signals.
 */
@Component({
  selector: 'app-ai-coach-panel',
  standalone: true,
  template: `
    <div class="rounded-xl border border-brand-green/30 bg-brand-green/5 p-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-display text-sm font-semibold text-ink">AI Coach</h3>
        <span class="text-xs text-slate2">{{ budgetText() }}</span>
      </div>
      <p class="mt-1 text-xs text-slate2">
        Optional. Generate a draft, then pick a variant to drop it into your campaign. Your
        own text is never replaced unless you choose a variant.
      </p>

      <div class="mt-3 flex items-center gap-2 text-xs">
        <span class="text-slate2">Language</span>
        <button type="button" (click)="locale.set('en')"
          [class]="locale() === 'en' ? activeChip : chip">EN</button>
        <button type="button" (click)="locale.set('de')"
          [class]="locale() === 'de' ? activeChip : chip">DE</button>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" (click)="genTitle()" [disabled]="disabled()" [class]="btn">
          Generate title
        </button>
        <button type="button" (click)="genStory()" [disabled]="disabled()" [class]="btn">
          Generate story
        </button>
        @for (c of channels; track c) {
          <button type="button" (click)="genShare(c)" [disabled]="disabled()" [class]="btn">
            {{ channelLabelFor(c) }} text
          </button>
        }
      </div>

      @if (error()) {
        <p class="mt-3 rounded-lg bg-brand-orange/10 px-3 py-2 text-xs font-medium text-brand-orange" role="alert">
          {{ error() }}
        </p>
      }
      @if (loading()) {
        <p class="mt-3 text-xs text-slate2">Generating…</p>
      }

      @if (titleVariants().length > 0) {
        <div class="mt-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-semibold text-ink">Title variants</h4>
            <button type="button" (click)="genTitle()" [disabled]="disabled()" [class]="refreshBtn">Refresh</button>
          </div>
          <ul class="mt-2 space-y-2">
            @for (v of titleVariants(); track $index) {
              <li class="flex items-start justify-between gap-2 rounded-lg bg-white p-2 ring-1 ring-black/5">
                <span class="text-sm text-ink">
                  {{ v.text }}
                  @if (v.recommended) { <span class="ml-1 text-[10px] font-semibold text-brand-green">RECOMMENDED</span> }
                </span>
                <button type="button" (click)="useTitle(v)" [class]="useBtn">Use</button>
              </li>
            }
          </ul>
        </div>
      }

      @if (storyVariants().length > 0) {
        <div class="mt-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-semibold text-ink">Story drafts</h4>
            <button type="button" (click)="genStory()" [disabled]="disabled()" [class]="refreshBtn">Refresh</button>
          </div>
          <ul class="mt-2 space-y-2">
            @for (v of storyVariants(); track $index) {
              <li class="rounded-lg bg-white p-2 ring-1 ring-black/5">
                <p class="whitespace-pre-line text-sm text-ink">{{ v.text }}</p>
                <div class="mt-2 flex justify-end">
                  <button type="button" (click)="useStory(v)" [class]="useBtn">Use this draft</button>
                </div>
              </li>
            }
          </ul>
        </div>
      }

      @if (shareVariants().length > 0) {
        <div class="mt-4">
          <h4 class="text-xs font-semibold text-ink">{{ shareHeading() }}</h4>
          <ul class="mt-2 space-y-2">
            @for (v of shareVariants(); track $index) {
              <li class="rounded-lg bg-white p-2 ring-1 ring-black/5">
                <p class="whitespace-pre-line text-sm text-ink">{{ preview(v.text) }}</p>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class AiCoachPanelComponent {
  private readonly api = inject(ApiService);

  // Wizard draft context (read-only inputs).
  readonly country = input<string>('');
  readonly school = input<string>('');
  readonly program = input<string>('');
  readonly goalEur = input<number>(0);
  readonly currentTitle = input<string>('');
  readonly currentBackground = input<string>('');

  // Apply actions back to the wizard signals.
  readonly applyTitle = output<string>();
  readonly applyStory = output<AiStoryParts>();

  readonly channels: AiShareChannel[] = ['whatsapp', 'email', 'linkedin'];

  readonly locale = signal<CoachLocale>('en');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly remaining = signal<number>(0);
  readonly limit = signal<number>(0);

  readonly titleVariants = signal<AiVariant[]>([]);
  readonly storyVariants = signal<AiStoryVariant[]>([]);
  readonly shareVariants = signal<AiVariant[]>([]);
  readonly shareChannel = signal<AiShareChannel | null>(null);

  readonly btn =
    'rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50';
  readonly refreshBtn =
    'rounded-md border border-brand-green/40 px-2 py-1 text-[11px] font-semibold text-brand-green hover:bg-brand-green/10 disabled:opacity-50';
  readonly useBtn =
    'shrink-0 rounded-md bg-brand-green/10 px-2 py-1 text-[11px] font-semibold text-brand-green hover:bg-brand-green/20';
  readonly chip = 'rounded-md border border-slate-200 px-2 py-0.5 text-slate2';
  readonly activeChip =
    'rounded-md border border-brand-green bg-brand-green/10 px-2 py-0.5 font-semibold text-brand-green';

  readonly budgetText = computed(() =>
    formatRemainingBudget(this.remaining(), this.limit()),
  );
  readonly disabled = computed(
    () => this.loading() || budgetExhausted(this.remaining()),
  );
  readonly shareHeading = computed(() => {
    const c = this.shareChannel();
    return c ? `${channelLabel(c)} variants` : 'Share variants';
  });

  constructor() {
    this.api.aiBudget().subscribe({
      next: (b) => {
        this.remaining.set(b.remainingTokens);
        this.limit.set(b.limitTokens);
      },
      error: () => void 0,
    });
  }

  channelLabelFor(c: AiShareChannel): string {
    return channelLabel(c);
  }

  preview(text: string): string {
    return variantPreview(text, 400);
  }

  genTitle(): void {
    this.run(() =>
      this.api.aiTitle({
        country: this.country() || 'my country',
        school: this.school() || 'my school',
        program: this.program() || 'MBA',
        motivation: this.currentBackground() || this.currentTitle() || 'fund my degree',
        locale: this.locale(),
      }),
    ).then((res) => {
      if (res) {
        this.titleVariants.set(res.variants);
        this.applyBudget(res.budget.remainingTokens);
      }
    });
  }

  genStory(): void {
    this.run(() =>
      this.api.aiStory({
        school: this.school() || 'my school',
        goalEur: this.goalEur() > 0 ? this.goalEur() : 1,
        motivation: this.currentBackground() || this.currentTitle() || 'fund my degree',
        background: this.currentBackground() || undefined,
        locale: this.locale(),
      }),
    ).then((res) => {
      if (res) {
        this.storyVariants.set(res.variants);
        this.applyBudget(res.budget.remainingTokens);
      }
    });
  }

  genShare(channel: AiShareChannel): void {
    this.run(() =>
      this.api.aiShare({
        channel,
        title: this.currentTitle() || 'My MBA campaign',
        story: this.currentBackground() || 'Help me fund my degree.',
        locale: this.locale(),
      }),
    ).then((res) => {
      if (res) {
        this.shareChannel.set(channel);
        this.shareVariants.set(res.variants);
        this.applyBudget(res.budget.remainingTokens);
      }
    });
  }

  useTitle(v: AiVariant): void {
    this.applyTitle.emit(v.text);
  }

  useStory(v: AiStoryVariant): void {
    this.applyStory.emit(v.parts);
  }

  private applyBudget(remaining: number): void {
    this.remaining.set(remaining);
  }

  private async run<T>(call: () => Observable<T>): Promise<T | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await new Promise<T>((resolve, reject) => {
        call().subscribe({ next: resolve, error: reject });
      });
      return result;
    } catch (err: unknown) {
      this.error.set(this.readError(err));
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  private readError(err: unknown): string {
    const e = err as { error?: { error?: { code?: string; message?: string } } };
    if (e?.error?.error?.code === 'BUDGET_EXCEEDED') {
      this.remaining.set(0);
      return 'Your AI token budget is used up. The manual editor still works.';
    }
    return e?.error?.error?.message ?? 'The coach could not generate right now.';
  }
}
