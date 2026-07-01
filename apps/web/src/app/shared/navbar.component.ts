import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a routerLink="/" class="flex items-baseline gap-2">
          <span class="font-display text-2xl font-bold tracking-tight text-ink">
            Bursa<span class="text-brand-orange">.</span>
          </span>
          <span class="hidden text-xs font-medium text-slate2 sm:inline">
            direct-to-school tuition
          </span>
        </a>

        <div class="flex items-center gap-1 sm:gap-2">
          <a
            routerLink="/campaigns"
            routerLinkActive="text-brand-green"
            class="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-mist"
          >
            Campaigns
          </a>

          @if (auth.isLoggedIn()) {
            <a
              [routerLink]="auth.homeForRole()"
              routerLinkActive="text-brand-green"
              class="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-mist"
            >
              My dashboard
            </a>
            <a
              routerLink="/groups"
              routerLinkActive="text-brand-green"
              class="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-mist"
            >
              Groups
            </a>
            <a
              routerLink="/account"
              routerLinkActive="text-brand-green"
              class="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-mist"
            >
              Account
            </a>
            <span class="hidden px-2 text-sm text-slate2 sm:inline">
              {{ auth.user()?.displayName }}
            </span>
            <button
              type="button"
              (click)="auth.logout()"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate2 hover:bg-mist"
            >
              Log out
            </button>
          } @else {
            <a
              routerLink="/login"
              class="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-mist"
            >
              Log in
            </a>
            <a
              routerLink="/register"
              [queryParams]="{ role: 'STUDENT' }"
              class="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Start a campaign
            </a>
          }
        </div>
      </nav>
    </header>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
}
