import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { ApiService } from '../../core/api.service';
import { galleryViewEvent } from '../../core/funnel-events';
import { CampaignCard, Stats } from '../../core/models';
import { CampaignCardComponent } from '../../shared/campaign-card.component';
import { GalleryHeroComponent } from './gallery-hero.component';
import { HowItWorksComponent } from './how-it-works.component';
import { StatsStripComponent } from './stats-strip.component';

/** Public landing page: hero, impact stats, how-it-works, and a searchable campaign gallery. */
@Component({
  selector: 'app-gallery-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CampaignCardComponent,
    GalleryHeroComponent,
    StatsStripComponent,
    HowItWorksComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <app-gallery-hero />

      @if (stats(); as s) {
        <div class="mt-10">
          <app-stats-strip [stats]="s" />
        </div>
      }

      <div class="mt-16">
        <app-how-it-works />
      </div>

      <div class="mt-16">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="font-display text-2xl font-bold text-ink">Browse campaigns</h2>
            <p class="mt-1 text-sm text-slate2">Verified students looking for support right now.</p>
          </div>

          <form class="flex w-full gap-2 sm:w-auto" (ngSubmit)="search()">
            <label class="sr-only" for="gallery-search">Search campaigns</label>
            <input
              id="gallery-search"
              name="gallery-search"
              type="search"
              [(ngModel)]="query"
              placeholder="Search by name, program, school…"
              class="w-full rounded-lg border border-slate-200 px-4 py-2 text-ink placeholder:text-slate2 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 sm:w-72"
            />
            <button
              type="submit"
              class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
              [disabled]="loading()"
            >
              Search
            </button>
            @if (query) {
              <button
                type="button"
                (click)="clear()"
                class="rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist"
              >
                Clear
              </button>
            }
          </form>
        </div>

        @if (error(); as e) {
          <div
            class="mt-6 rounded-2xl bg-brand-orange/10 p-6 text-center text-sm font-medium text-brand-orange ring-1 ring-brand-orange/20"
          >
            {{ e }}
          </div>
        } @else if (loading()) {
          <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            @for (slot of skeletons; track slot) {
              <div
                class="h-72 animate-pulse rounded-2xl bg-white shadow-card ring-1 ring-black/5"
              ></div>
            }
          </div>
        } @else if (campaigns().length === 0) {
          <div class="mt-6 rounded-2xl bg-white p-12 text-center shadow-card ring-1 ring-black/5">
            <p class="font-display text-lg font-semibold text-ink">No campaigns found</p>
            <p class="mt-2 text-sm text-slate2">
              @if (query) {
                Nothing matched “{{ query }}”. Try a different search.
              } @else {
                There are no live campaigns yet. Check back soon.
              }
            </p>
            @if (query) {
              <button
                type="button"
                (click)="clear()"
                class="mt-4 rounded-lg border border-slate-200 px-4 py-2 hover:bg-mist"
              >
                Clear search
              </button>
            } @else {
              <a
                [routerLink]="['/register']"
                [queryParams]="{ role: 'STUDENT' }"
                class="mt-4 inline-block rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90"
              >
                Start the first campaign
              </a>
            }
          </div>
        } @else {
          <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            @for (c of campaigns(); track c.id) {
              <app-campaign-card [campaign]="c" />
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class GalleryPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly analytics = inject(AnalyticsService);

  readonly campaigns = signal<CampaignCard[]>([]);
  readonly stats = signal<Stats | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  query = '';
  readonly skeletons = [0, 1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.analytics.track(galleryViewEvent('/campaigns'));
    this.loadStats();
    this.loadCampaigns();
  }

  search(): void {
    this.loadCampaigns();
  }

  clear(): void {
    this.query = '';
    this.loadCampaigns();
  }

  private loadCampaigns(): void {
    this.loading.set(true);
    this.error.set(null);

    const q = this.query.trim();
    this.api.gallery(q ? { q } : {}).subscribe({
      next: (list) => {
        this.campaigns.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Something went wrong');
        this.loading.set(false);
      },
    });
  }

  private loadStats(): void {
    this.api.stats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(null),
    });
  }
}
