import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TransparencyView } from '../../core/models';
import {
  geographyBars,
  GeographyBar,
  paidOutPercent,
  statTiles,
  StatTile,
} from './transparency-format';

/**
 * E12 — Public, embeddable per-school transparency page. Shows aggregate funding
 * statistics (total raised, total paid out, average donation, donor geography)
 * for the school in the route. PII-free: no individual donor is ever shown. All
 * formatting goes through the pure `transparency-format` helpers.
 */
@Component({
  selector: 'app-transparency-page',
  standalone: true,
  imports: [],
  template: `
    <section class="mx-auto max-w-4xl px-4 py-12">
      @if (error()) {
        <p class="rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange" role="alert">
          {{ error() }}
        </p>
      }

      @if (data(); as d) {
        <header class="mb-8 text-center">
          <p class="text-xs uppercase tracking-wide text-slate2">Funding transparency</p>
          <h1 class="mt-1 font-display text-3xl font-semibold text-ink">{{ d.schoolName }}</h1>
          <p class="mt-2 text-sm text-slate2">
            Every euro raised is paid directly to the school — never to a student.
          </p>
        </header>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (tile of tiles(); track tile.label) {
            <div class="rounded-2xl bg-white p-5 text-center shadow-card ring-1 ring-black/5">
              <p class="text-xs uppercase tracking-wide text-slate2">{{ tile.label }}</p>
              <p class="mt-1 font-display text-2xl font-semibold text-ink">{{ tile.value }}</p>
            </div>
          }
        </div>

        <div class="mt-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <div class="mb-2 flex items-baseline justify-between text-sm">
            <span class="font-medium text-ink">Paid directly to the school</span>
            <span class="text-slate2">{{ paidPercent() }}%</span>
          </div>
          <div class="h-3 w-full rounded-full bg-mist">
            <div class="h-3 rounded-full bg-brand-green" [style.width.%]="paidPercent()"></div>
          </div>
        </div>

        <div class="mt-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <h3 class="mb-4 font-display text-lg font-semibold text-ink">Donors by geography</h3>
          @if (bars().length === 0) {
            <p class="text-sm text-slate2">No donations yet.</p>
          }
          <div class="space-y-3">
            @for (row of bars(); track row.country) {
              <div>
                <div class="mb-1 flex items-baseline justify-between text-sm">
                  <span class="text-ink">{{ row.country }}</span>
                  <span class="text-slate2">{{ row.amountLabel }} · {{ row.donationCount }}</span>
                </div>
                <div class="h-2 w-full rounded-full bg-mist">
                  <div
                    class="h-2 rounded-full bg-brand-blue"
                    [style.width]="row.widthPercent"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class TransparencyPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly data = signal<TransparencyView | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    const schoolId = this.route.snapshot.paramMap.get('schoolId');
    if (!schoolId) {
      this.error.set('No school specified.');
      return;
    }
    this.api.transparency(schoolId).subscribe({
      next: (d) => this.data.set(d),
      error: () => this.error.set('Could not load the transparency data.'),
    });
  }

  tiles(): StatTile[] {
    const d = this.data();
    return d ? statTiles(d) : [];
  }

  bars(): GeographyBar[] {
    const d = this.data();
    return d ? geographyBars(d.donorGeography) : [];
  }

  paidPercent(): number {
    const d = this.data();
    return d ? paidOutPercent(d) : 0;
  }
}
