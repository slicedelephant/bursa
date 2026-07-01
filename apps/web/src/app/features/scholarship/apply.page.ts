import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { PublicApplicationForm, PublicFormField } from '../../core/models';
import { visibleFields } from './apply-visibility';

/**
 * E19 — public scholarship application form (token-gated, no login). Fields with
 * unmet conditional rules are hidden client-side, mirroring the backend core.
 */
@Component({
  selector: 'app-apply-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-2xl px-4 py-10">
      @if (loadError()) {
        <p class="rounded-2xl bg-white p-6 text-sm text-brand-orange shadow-card">
          This application link is invalid or has expired.
        </p>
      } @else if (submitted()) {
        <div class="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-black/5">
          <h1 class="font-display text-2xl font-semibold text-ink">Application received</h1>
          <p class="mt-2 text-sm text-slate2">Thank you — we will be in touch.</p>
        </div>
      } @else if (data(); as d) {
        <header class="mb-6">
          <p class="text-sm font-medium" [style.color]="d.program.brandPrimary">
            {{ d.program.name }}
          </p>
          <h1 class="font-display text-3xl font-semibold text-ink">{{ d.form.title }}</h1>
          @if (d.form.intro) {
            <p class="mt-1 text-sm text-slate2">{{ d.form.intro }}</p>
          }
        </header>

        <form
          class="space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5"
          (ngSubmit)="submit(d)"
        >
          <input
            class="w-full rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Your full name"
            name="applicantName"
            [(ngModel)]="applicantName"
          />
          <input
            class="w-full rounded-lg border border-mist px-3 py-2 text-sm"
            placeholder="Your email"
            name="applicantEmail"
            [(ngModel)]="applicantEmail"
          />

          @for (f of shown(d.form.fields); track f.fieldKey) {
            <label class="block">
              <span class="text-sm text-ink">
                {{ f.label }}
                @if (f.required) {
                  <span class="text-brand-orange"> *</span>
                }
              </span>
              @if (f.type === 'SELECT') {
                <select
                  class="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
                  [name]="f.fieldKey"
                  [(ngModel)]="answers[f.fieldKey]"
                >
                  <option value="">—</option>
                  @for (o of f.options; track o) {
                    <option [value]="o">{{ o }}</option>
                  }
                </select>
              } @else if (f.type === 'LONG_TEXT') {
                <textarea
                  class="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
                  rows="4"
                  [name]="f.fieldKey"
                  [(ngModel)]="answers[f.fieldKey]"
                ></textarea>
              } @else {
                <input
                  class="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
                  [name]="f.fieldKey"
                  [(ngModel)]="answers[f.fieldKey]"
                />
              }
            </label>
          }

          <button
            type="submit"
            class="w-full rounded-lg px-3 py-2 text-sm text-white"
            [style.background]="d.program.brandPrimary"
          >
            Submit application
          </button>
          @if (submitError()) {
            <p class="text-sm text-brand-orange">{{ submitError() }}</p>
          }
        </form>
      }
    </section>
  `,
})
export class ApplyPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly data = signal<PublicApplicationForm | null>(null);
  readonly loadError = signal(false);
  readonly submitted = signal(false);
  readonly submitError = signal<string | null>(null);

  applicantName = '';
  applicantEmail = '';
  answers: Record<string, string> = {};

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.api.publicApplicationForm(this.token).subscribe({
      next: (d) => this.data.set(d),
      error: () => this.loadError.set(true),
    });
  }

  shown(fields: PublicFormField[]): PublicFormField[] {
    return visibleFields(fields, this.answers);
  }

  submit(d: PublicApplicationForm): void {
    this.submitError.set(null);
    const visibleKeys = new Set(this.shown(d.form.fields).map((f) => f.fieldKey));
    const filtered = Object.fromEntries(
      Object.entries(this.answers).filter(([key]) => visibleKeys.has(key)),
    );
    this.api
      .submitApplication(this.token, {
        applicantName: this.applicantName,
        applicantEmail: this.applicantEmail,
        answers: filtered,
      })
      .subscribe({
        next: () => this.submitted.set(true),
        error: (err) => this.submitError.set(err?.error?.error ?? 'Please check your answers.'),
      });
  }
}
