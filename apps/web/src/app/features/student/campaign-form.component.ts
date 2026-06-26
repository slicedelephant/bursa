import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { MoneyPipe } from '../../core/money.pipe';
import { School } from '../../core/models';

/** Step 2: a student creates their funding campaign. Emits `saved` on success. */
@Component({
  selector: 'app-student-campaign-form',
  standalone: true,
  imports: [FormsModule, MoneyPipe],
  template: `
    <form
      (ngSubmit)="submit()"
      class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5"
      novalidate
    >
      <h2 class="font-display text-xl font-semibold text-ink">Create your campaign</h2>
      <p class="mt-1 text-sm text-slate2">
        Set up the program you need funding for. You can submit it for verification afterwards.
      </p>

      @if (error()) {
        <p class="mt-4 rounded-lg bg-brand-orange/10 px-3 py-2 text-sm font-medium text-brand-orange" role="alert">
          {{ error() }}
        </p>
      }

      <div class="mt-6 space-y-4">
        <div>
          <label for="schoolId" class="block text-sm font-medium text-ink">School</label>
          @if (schoolsError()) {
            <p class="mt-1 text-sm text-brand-orange">{{ schoolsError() }}</p>
          } @else {
            <select
              id="schoolId"
              name="schoolId"
              [(ngModel)]="schoolId"
              required
              [disabled]="loadingSchools()"
              [class]="inputClass"
            >
              <option value="" disabled>
                {{ loadingSchools() ? 'Loading schools…' : 'Select your school' }}
              </option>
              @for (school of schools(); track school.id) {
                <option [value]="school.id">{{ school.name }} — {{ school.country }}</option>
              }
            </select>
          }
        </div>

        <div>
          <label for="programName" class="block text-sm font-medium text-ink">Program name</label>
          <input
            id="programName"
            name="programName"
            [(ngModel)]="programName"
            required
            placeholder="BSc Computer Science"
            [class]="inputClass"
          />
        </div>

        <div>
          <label for="title" class="block text-sm font-medium text-ink">Campaign title</label>
          <input
            id="title"
            name="title"
            [(ngModel)]="title"
            required
            placeholder="Help me finish my degree"
            [class]="inputClass"
          />
        </div>

        <div>
          <label for="story" class="block text-sm font-medium text-ink">Campaign story</label>
          <textarea
            id="story"
            name="story"
            [(ngModel)]="story"
            required
            rows="5"
            placeholder="Explain what the funds will cover and the impact they will have."
            [class]="inputClass"
          ></textarea>
        </div>

        <div>
          <label for="goalEur" class="block text-sm font-medium text-ink">Goal (EUR)</label>
          <input
            id="goalEur"
            name="goalEur"
            type="number"
            min="1"
            step="1"
            [(ngModel)]="goalEur"
            required
            placeholder="5000"
            [class]="inputClass"
          />
          <p class="mt-1 text-xs text-slate2">Funding goal: {{ goalCents() | money }}</p>
        </div>

        <div>
          <label for="deadline" class="block text-sm font-medium text-ink">
            Deadline <span class="font-normal text-slate2">(optional)</span>
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            [(ngModel)]="deadline"
            [class]="inputClass"
          />
        </div>
      </div>

      <button
        type="submit"
        [disabled]="submitting() || !schoolId || !programName || !title || !story || !goalEur"
        class="mt-6 rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        @if (submitting()) {
          Creating…
        } @else {
          Create campaign
        }
      </button>
    </form>
  `,
})
export class StudentCampaignForm implements OnInit {
  private readonly api = inject(ApiService);

  /** Emitted after the campaign is created so the parent can reload. */
  readonly saved = output<void>();

  schoolId = '';
  programName = '';
  title = '';
  story = '';
  goalEur: number | null = null;
  deadline = '';

  readonly schools = signal<School[]>([]);
  readonly loadingSchools = signal(true);
  readonly schoolsError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-ink placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:opacity-50';

  ngOnInit(): void {
    this.api.listSchools().subscribe({
      next: (schools) => {
        this.schools.set(schools);
        this.loadingSchools.set(false);
      },
      error: (err) => {
        this.loadingSchools.set(false);
        this.schoolsError.set(err?.error?.error?.message ?? 'Could not load schools');
      },
    });
  }

  /** Goal entered in euros, expressed as integer cents for display and submission. */
  goalCents(): number {
    return Math.round((this.goalEur ?? 0) * 100);
  }

  submit(): void {
    if (this.submitting()) return;

    const programName = this.programName.trim();
    const title = this.title.trim();
    const story = this.story.trim();
    const goalCents = this.goalCents();
    if (!this.schoolId || !programName || !title || !story || goalCents <= 0) {
      this.error.set('Please complete all required fields with a valid goal.');
      return;
    }

    const body = {
      schoolId: this.schoolId,
      programName,
      title,
      story,
      goalCents,
      ...(this.deadline ? { deadline: this.deadline } : {}),
    };

    this.submitting.set(true);
    this.error.set(null);
    this.api.createCampaign(body).subscribe({
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
