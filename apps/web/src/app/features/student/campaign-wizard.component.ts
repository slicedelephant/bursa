import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { AiStoryParts, School } from '../../core/models';
import { CampaignVideoComponent } from '../campaign/campaign-video.component';
import { AiCoachPanelComponent } from './ai-coach-panel.component';
import {
  STORY_PROMPTS,
  composeStory,
  isStoryReady,
} from './story-framework';
import { toEmbed } from '../campaign/video-embed';
import {
  WizardStorage,
  clearWizardState,
  loadWizardState,
  saveWizardState,
} from './campaign-wizard.storage';

/**
 * Multi-step campaign onboarding: Basics -> guided Story -> Video & Review.
 * Only required fields per step, a progress indicator, and localStorage autosave
 * so progress survives a reload. The campaign is created in one call at the end.
 */
@Component({
  selector: 'app-student-campaign-wizard',
  standalone: true,
  imports: [FormsModule, MoneyPipe, CampaignVideoComponent, AiCoachPanelComponent],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="mb-6">
        <div class="flex items-center justify-between text-sm">
          <h2 class="font-display text-xl font-semibold text-ink">{{ steps[step() - 1] }}</h2>
          <span class="text-slate2">Step {{ step() }} of 3</span>
        </div>
        <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist">
          <div
            class="h-full rounded-full bg-brand-green transition-[width]"
            [style.width.%]="(step() / 3) * 100"
          ></div>
        </div>
      </div>

      @if (error()) {
        <p class="mb-4 rounded-lg bg-brand-orange/10 px-3 py-2 text-sm font-medium text-brand-orange" role="alert">
          {{ error() }}
        </p>
      }

      @switch (step()) {
        @case (1) {
          <div class="space-y-4">
            <div>
              <label for="w-school" class="block text-sm font-medium text-ink">School</label>
              <select
                id="w-school"
                [ngModel]="schoolId()"
                (ngModelChange)="schoolId.set($event)"
                [class]="inputClass"
              >
                <option value="" disabled>Select your school</option>
                @for (s of schools(); track s.id) {
                  <option [value]="s.id">{{ s.name }} — {{ s.country }}</option>
                }
              </select>
            </div>
            <div>
              <label for="w-program" class="block text-sm font-medium text-ink">Program name</label>
              <input id="w-program" [ngModel]="programName()" (ngModelChange)="programName.set($event)"
                placeholder="Full-Time MBA 2026" [class]="inputClass" />
            </div>
            <div>
              <label for="w-title" class="block text-sm font-medium text-ink">Campaign title</label>
              <input id="w-title" [ngModel]="title()" (ngModelChange)="title.set($event)"
                placeholder="Help me finish my MBA" [class]="inputClass" />
            </div>
            <div>
              <label for="w-goal" class="block text-sm font-medium text-ink">Goal (EUR)</label>
              <input id="w-goal" type="number" min="10" step="1"
                [ngModel]="goalEur()" (ngModelChange)="goalEur.set($event)"
                placeholder="42000" [class]="inputClass" />
              <p class="mt-1 text-xs text-slate2">Funding goal: {{ goalCents() | money }}</p>
            </div>
            <div>
              <label for="w-deadline" class="block text-sm font-medium text-ink">
                Study-start deadline <span class="font-normal text-slate2">(optional)</span>
              </label>
              <input id="w-deadline" type="date" [ngModel]="deadline()" (ngModelChange)="deadline.set($event)"
                [class]="inputClass" />
            </div>
          </div>
        }

        @case (2) {
          <p class="mb-4 text-sm text-slate2">
            We guide your story instead of leaving you a blank page. Answer the prompts —
            we will weave them into your campaign story.
          </p>
          <div class="space-y-5">
            @for (p of prompts; track p.key) {
              <div>
                <label [for]="'w-' + p.key" class="block text-sm font-medium text-ink">{{ p.label }}</label>
                <p class="mb-1 text-xs text-slate2">{{ p.hint }}</p>
                <textarea
                  [id]="'w-' + p.key"
                  rows="3"
                  [ngModel]="storyValue(p.key)"
                  (ngModelChange)="setStory(p.key, $event)"
                  [placeholder]="p.placeholder"
                  [class]="inputClass"
                ></textarea>
              </div>
            }
          </div>
          @if (!storyReady()) {
            <p class="mt-3 text-xs text-slate2">
              Add a little more — your story needs at least a couple of sentences.
            </p>
          }

          <div class="mt-5">
            <app-ai-coach-panel
              [country]="''"
              [school]="schoolName()"
              [program]="programName()"
              [goalEur]="goalEur() ?? 0"
              [currentTitle]="title()"
              [currentBackground]="background()"
              (applyTitle)="onApplyTitle($event)"
              (applyStory)="onApplyStory($event)"
            />
          </div>
        }

        @case (3) {
          <div class="space-y-5">
            <div>
              <label for="w-video" class="block text-sm font-medium text-ink">
                Pitch video <span class="font-normal text-slate2">(optional, YouTube or Vimeo link)</span>
              </label>
              <input id="w-video" [ngModel]="videoUrl()" (ngModelChange)="videoUrl.set($event)"
                placeholder="https://youtu.be/…" [class]="inputClass" />
              @if (videoInvalid()) {
                <p class="mt-1 text-sm text-brand-orange">
                  Paste a YouTube or Vimeo link — other links cannot be embedded.
                </p>
              }
            </div>

            @if (!videoInvalid() && videoUrl().trim()) {
              <app-campaign-video [videoUrl]="videoUrl()" />
            }

            <div class="rounded-xl bg-mist p-4">
              <h3 class="font-display text-sm font-semibold text-ink">Review</h3>
              <dl class="mt-2 space-y-1 text-sm text-slate2">
                <div><span class="font-medium text-ink">Title:</span> {{ title() }}</div>
                <div><span class="font-medium text-ink">Program:</span> {{ programName() }}</div>
                <div><span class="font-medium text-ink">Goal:</span> {{ goalCents() | money }}</div>
              </dl>
              <p class="mt-3 whitespace-pre-line text-sm text-ink">{{ composedStory() }}</p>
            </div>
          </div>
        }
      }

      <div class="mt-6 flex items-center justify-between gap-3">
        <button type="button" (click)="back()" [disabled]="step() === 1"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-40">
          Back
        </button>

        @if (step() < 3) {
          <button type="button" (click)="next()" [disabled]="!currentStepValid()"
            class="rounded-lg bg-brand-green px-5 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50">
            Continue
          </button>
        } @else {
          <button type="button" (click)="create()" [disabled]="!canCreate() || submitting()"
            class="rounded-lg bg-brand-green px-5 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50">
            @if (submitting()) { Creating… } @else { Create campaign }
          </button>
        }
      </div>
    </div>
  `,
})
export class CampaignWizardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly storage: WizardStorage | null =
    typeof localStorage !== 'undefined' ? localStorage : null;

  readonly saved = output<void>();

  readonly steps = ['Campaign basics', 'Your story', 'Video & review'];
  readonly prompts = STORY_PROMPTS;

  readonly step = signal(1);
  readonly schoolId = signal('');
  readonly programName = signal('');
  readonly title = signal('');
  readonly goalEur = signal<number | null>(null);
  readonly deadline = signal('');
  readonly background = signal('');
  readonly challenge = signal('');
  readonly vision = signal('');
  readonly videoUrl = signal('');

  readonly schools = signal<School[]>([]);
  readonly schoolsError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  /** Once the campaign is created we stop autosaving so the draft stays cleared. */
  private readonly committed = signal(false);

  readonly inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-ink placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

  readonly goalCents = computed(() => Math.round((this.goalEur() ?? 0) * 100));

  readonly step1Valid = computed(
    () =>
      this.schoolId() !== '' &&
      this.programName().trim().length >= 3 &&
      this.title().trim().length >= 5 &&
      this.goalCents() >= 1000,
  );

  /** Resolve the selected school's name for the coach context (best-effort). */
  readonly schoolName = computed(
    () => this.schools().find((s) => s.id === this.schoolId())?.name ?? '',
  );

  readonly storyParts = computed(() => ({
    background: this.background(),
    challenge: this.challenge(),
    vision: this.vision(),
  }));
  readonly composedStory = computed(() => composeStory(this.storyParts()));
  readonly storyReady = computed(() => isStoryReady(this.storyParts()));

  readonly videoInvalid = computed(
    () => this.videoUrl().trim().length > 0 && toEmbed(this.videoUrl()) === null,
  );

  readonly currentStepValid = computed(() => {
    if (this.step() === 1) return this.step1Valid();
    if (this.step() === 2) return this.storyReady();
    return !this.videoInvalid();
  });

  readonly canCreate = computed(
    () => this.step1Valid() && this.storyReady() && !this.videoInvalid(),
  );

  constructor() {
    const restored = loadWizardState(this.storage);
    if (restored) {
      this.step.set(Math.min(3, Math.max(1, restored.step)));
      this.schoolId.set(restored.schoolId);
      this.programName.set(restored.programName);
      this.title.set(restored.title);
      this.goalEur.set(restored.goalEur);
      this.deadline.set(restored.deadline);
      this.background.set(restored.background);
      this.challenge.set(restored.challenge);
      this.vision.set(restored.vision);
      this.videoUrl.set(restored.videoUrl);
    }

    effect(() => {
      if (this.committed()) return;
      saveWizardState(this.storage, {
        step: this.step(),
        schoolId: this.schoolId(),
        programName: this.programName(),
        title: this.title(),
        goalEur: this.goalEur(),
        deadline: this.deadline(),
        background: this.background(),
        challenge: this.challenge(),
        vision: this.vision(),
        videoUrl: this.videoUrl(),
      });
    });
  }

  ngOnInit(): void {
    this.api.listSchools().subscribe({
      next: (schools) => this.schools.set(schools),
      error: (err) =>
        this.schoolsError.set(err?.error?.error?.message ?? 'Could not load schools'),
    });
  }

  storyValue(key: 'background' | 'challenge' | 'vision'): string {
    return this[key]();
  }

  setStory(key: 'background' | 'challenge' | 'vision', value: string): void {
    this[key].set(value);
  }

  /** Apply an AI-suggested title (deliberate user action, never automatic). */
  onApplyTitle(title: string): void {
    this.title.set(title);
  }

  /** Apply an AI-suggested story draft into the three guided parts. */
  onApplyStory(parts: AiStoryParts): void {
    if (parts.background) this.background.set(parts.background);
    if (parts.challenge) this.challenge.set(parts.challenge);
    if (parts.vision) this.vision.set(parts.vision);
  }

  next(): void {
    if (!this.currentStepValid()) return;
    this.step.update((s) => Math.min(3, s + 1));
  }

  back(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  create(): void {
    if (!this.canCreate() || this.submitting()) return;

    const deadline = this.deadline().trim();
    const video = this.videoUrl().trim();
    const body = {
      schoolId: this.schoolId(),
      programName: this.programName().trim(),
      title: this.title().trim(),
      story: this.composedStory(),
      goalCents: this.goalCents(),
      ...(deadline ? { deadline } : {}),
      ...(video ? { videoUrl: video } : {}),
      ...(this.background().trim() ? { storyBackground: this.background().trim() } : {}),
      ...(this.challenge().trim() ? { storyChallenge: this.challenge().trim() } : {}),
      ...(this.vision().trim() ? { storyVision: this.vision().trim() } : {}),
    };

    this.submitting.set(true);
    this.error.set(null);
    this.api.createCampaign(body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.committed.set(true);
        clearWizardState(this.storage);
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
      },
    });
  }
}
