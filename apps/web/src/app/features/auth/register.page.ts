import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PasswordStrengthMeterComponent } from './password-strength-meter.component';

type RegisterRole = 'DONOR' | 'STUDENT' | 'SPONSOR';

const ROLE_OPTIONS: { value: RegisterRole; label: string }[] = [
  { value: 'DONOR', label: 'Donor' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'SPONSOR', label: 'Company / Sponsor' },
];

const ROLE_BLURBS: Record<RegisterRole, string> = {
  DONOR: 'Back a student you believe in and follow their journey to graduation.',
  STUDENT: 'Raise the tuition you need and tell your story to people who want to help.',
  SPONSOR: 'Fund admitted students directly into their schools, with receipts for every gift.',
};

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PasswordStrengthMeterComponent],
  template: `
    <section class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-mist px-4 py-12">
      <div class="mx-auto w-full max-w-md">
        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5 sm:p-8">
          <header class="mb-6 text-center">
            <h1 class="font-display text-2xl font-semibold text-ink">Create your account</h1>
            <p class="mt-1 text-sm text-slate2">
              Students raise tuition for their studies. Companies and sponsors fund admitted
              students directly to their schools.
            </p>
          </header>

          @if (error()) {
            <div
              class="mb-4 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm font-medium text-brand-orange"
              role="alert"
            >
              {{ error() }}
            </div>
          }

          <form class="space-y-4" (ngSubmit)="onSubmit()">
            <div>
              <label for="displayName" class="mb-1 block text-sm font-medium text-ink">
                Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autocomplete="name"
                required
                [(ngModel)]="displayName"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label for="email" class="mb-1 block text-sm font-medium text-ink">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                [(ngModel)]="email"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label for="password" class="mb-1 block text-sm font-medium text-ink">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                [(ngModel)]="password"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
                placeholder="Choose a strong password"
              />
              <app-password-strength-meter [password]="password" />
            </div>

            <div>
              <label for="role" class="mb-1 block text-sm font-medium text-ink">I am a…</label>
              <select
                id="role"
                name="role"
                [(ngModel)]="role"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-ink outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
              >
                @for (option of roleOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
              <p class="mt-1.5 text-sm text-slate2">{{ roleBlurb }}</p>
            </div>

            <button
              type="submit"
              [disabled]="loading()"
              class="w-full rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {{ loading() ? 'Creating account…' : 'Create account' }}
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-slate2">
            Already have an account?
            <a [routerLink]="['/login']" class="font-semibold text-brand-green hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </section>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly roleOptions = ROLE_OPTIONS;

  displayName = '';
  email = '';
  password = '';
  role: RegisterRole = this.initialRole();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get roleBlurb(): string {
    return ROLE_BLURBS[this.role];
  }

  onSubmit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth
      .register({
        email: this.email,
        password: this.password,
        displayName: this.displayName,
        role: this.role,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate([this.auth.homeForRole()]);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.error?.error?.message ?? 'Could not create your account. Please try again.',
          );
        },
      });
  }

  private initialRole(): RegisterRole {
    const param = this.route.snapshot.queryParamMap.get('role');
    const allowed: RegisterRole[] = ['DONOR', 'STUDENT', 'SPONSOR'];
    return allowed.includes(param as RegisterRole) ? (param as RegisterRole) : 'DONOR';
  }
}
