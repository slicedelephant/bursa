import { Component, input, output } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { PortfolioItem } from '../../core/models';

/** Mobile-first "My students" portfolio grid. One card per supported student with
 * photo, progress, your contribution, a verified badge and a 1-tap donate-again CTA.
 * Emits the campaign id to donate to again. */
@Component({
  selector: 'app-portfolio-grid',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-lg font-semibold text-ink">My students</h2>

      @if (items().length === 0) {
        <p class="mt-4 text-sm text-slate2">
          No students in your portfolio yet. When you support a student, they appear here.
        </p>
      } @else {
        <ul class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          @for (item of items(); track item.campaignId) {
            <li class="flex gap-3 rounded-xl ring-1 ring-black/5 p-3">
              @if (item.photoUrl) {
                <img
                  [src]="item.photoUrl"
                  [alt]="item.studentName"
                  class="h-14 w-14 flex-shrink-0 rounded-full object-cover"
                />
              } @else {
                <div
                  class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate2"
                >
                  {{ initial(item) }}
                </div>
              }
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate font-medium text-ink">{{ item.studentName }}</p>
                  @if (item.verified) {
                    <span
                      class="rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-semibold text-brand-green"
                      >Verified</span
                    >
                  }
                </div>
                <p class="truncate text-xs text-slate2">
                  {{ item.schoolName }} · {{ item.country }}
                </p>
                <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full bg-brand-green"
                    [style.width.%]="item.percent"
                  ></div>
                </div>
                <p class="mt-1 text-xs text-slate2">
                  {{ item.percent }}% funded · you gave
                  {{ item.yourContributionCents | money: true }}
                </p>
                @if (item.canDonateAgain) {
                  <button
                    type="button"
                    (click)="donateAgain.emit(item.campaignId)"
                    class="mt-2 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Donate again
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class PortfolioGridComponent {
  readonly items = input.required<PortfolioItem[]>();
  readonly donateAgain = output<string>();

  initial(item: PortfolioItem): string {
    return item.studentName.charAt(0).toUpperCase();
  }
}
