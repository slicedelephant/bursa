import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

/** Step 1: a student creates their public profile. Emits `saved` on success. */
@Component({
  selector: 'app-student-profile-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form
      (ngSubmit)="submit()"
      class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5"
      novalidate
    >
      <h2 class="font-display text-xl font-semibold text-ink">Create your profile</h2>
      <p class="mt-1 text-sm text-slate2">
        Tell donors who you are. This information appears on your campaign page.
      </p>

      @if (error()) {
        <p
          class="mt-4 rounded-lg bg-brand-orange/10 px-3 py-2 text-sm font-medium text-brand-orange"
          role="alert"
        >
          {{ error() }}
        </p>
      }

      <div class="mt-6 space-y-4">
        <div>
          <label for="fullName" class="block text-sm font-medium text-ink">Full name</label>
          <input
            id="fullName"
            name="fullName"
            [(ngModel)]="fullName"
            required
            autocomplete="name"
            placeholder="Amara Okonkwo"
            [class]="inputClass"
          />
        </div>

        <div>
          <label for="country" class="block text-sm font-medium text-ink">Country</label>
          <input
            id="country"
            name="country"
            [(ngModel)]="country"
            required
            autocomplete="country-name"
            placeholder="Nigeria"
            [class]="inputClass"
          />
        </div>

        <div>
          <label for="story" class="block text-sm font-medium text-ink">Your story</label>
          <textarea
            id="story"
            name="story"
            [(ngModel)]="story"
            required
            rows="5"
            placeholder="Share your background, your goals, and why this matters to you."
            [class]="inputClass"
          ></textarea>
        </div>

        <div>
          <label for="recommendation" class="block text-sm font-medium text-ink">
            Recommendation <span class="font-normal text-slate2">(optional)</span>
          </label>
          <textarea
            id="recommendation"
            name="recommendation"
            [(ngModel)]="recommendation"
            rows="3"
            placeholder="A note from a teacher, mentor, or school official."
            [class]="inputClass"
          ></textarea>
        </div>

        <div>
          <label for="photoUrl" class="block text-sm font-medium text-ink">
            Photo URL <span class="font-normal text-slate2">(optional)</span>
          </label>
          <input
            id="photoUrl"
            name="photoUrl"
            type="url"
            [(ngModel)]="photoUrl"
            placeholder="https://example.com/photo.jpg"
            [class]="inputClass"
          />
        </div>
      </div>

      <button
        type="submit"
        [disabled]="submitting() || !fullName || !country || !story"
        class="mt-6 rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        @if (submitting()) {
          Saving…
        } @else {
          Save profile
        }
      </button>
    </form>
  `,
})
export class StudentProfileForm {
  private readonly api = inject(ApiService);

  /** Emitted after the profile is saved so the parent can reload. */
  readonly saved = output<void>();

  fullName = '';
  country = '';
  story = '';
  recommendation = '';
  photoUrl = '';

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-ink placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

  submit(): void {
    if (this.submitting()) return;

    const fullName = this.fullName.trim();
    const country = this.country.trim();
    const story = this.story.trim();
    if (!fullName || !country || !story) {
      this.error.set('Please fill in your name, country, and story.');
      return;
    }

    const recommendation = this.recommendation.trim();
    const photoUrl = this.photoUrl.trim();
    const body = {
      fullName,
      country,
      story,
      ...(recommendation ? { recommendation } : {}),
      ...(photoUrl ? { photoUrl } : {}),
    };

    this.submitting.set(true);
    this.error.set(null);
    this.api.upsertStudentProfile(body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
      },
    });
  }
}
