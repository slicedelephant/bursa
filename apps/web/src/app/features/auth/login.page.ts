import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-mist px-4 py-12">
      <div class="mx-auto w-full max-w-md">
        <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5 sm:p-8">
          <header class="mb-6 text-center">
            <h1 class="font-display text-2xl font-semibold text-ink">Welcome back</h1>
            <p class="mt-1 text-sm text-slate2">Sign in to continue funding futures.</p>
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
                autocomplete="current-password"
                required
                [(ngModel)]="password"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-ink outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading()"
              class="w-full rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-slate2">
            Don't have an account?
            <a [routerLink]="['/register']" class="font-semibold text-brand-green hover:underline">
              Create one
            </a>
          </p>
        </div>
      </div>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  onSubmit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate([this.auth.homeForRole()]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.error?.message ?? 'Could not sign in. Check your details and try again.',
        );
      },
    });
  }
}
