import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Public landing hero with the platform claim and the two primary CTAs. */
@Component({
  selector: 'app-gallery-hero',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div
      class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-green/10 via-mist to-brand-blue/10 px-6 py-16 ring-1 ring-black/5 sm:px-12 sm:py-20"
    >
      <div class="mx-auto max-w-3xl text-center">
        <span
          class="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand-green ring-1 ring-brand-green/20"
        >
          Direct school funding
        </span>

        <h1 class="mt-5 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Funding that goes straight to the school —
          <span class="text-brand-green">never to the student.</span>
        </h1>

        <p class="mx-auto mt-5 max-w-2xl text-lg text-slate2">
          Bursa connects admitted business-school students with donors and sponsors. Every euro is
          verified and paid directly to the institution.
        </p>

        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            [routerLink]="['/register']"
            [queryParams]="{ role: 'STUDENT' }"
            class="rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white shadow-card transition hover:opacity-90"
          >
            Start a campaign
          </a>
          <a
            [routerLink]="['/register']"
            [queryParams]="{ role: 'SPONSOR' }"
            class="rounded-lg border border-slate-200 bg-white px-6 py-3 font-semibold text-ink transition hover:bg-mist"
          >
            Become a sponsor
          </a>
        </div>
      </div>
    </div>
  `,
})
export class GalleryHeroComponent {}
