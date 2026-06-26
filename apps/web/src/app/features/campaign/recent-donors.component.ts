import { Component, Input } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { PublicDonation } from '../../core/models';
import { relativeTime } from './relative-time';

@Component({
  selector: 'app-recent-donors',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    @if (donations.length) {
      <ul class="divide-y divide-slate-100">
        @for (donation of donations; track donation.id) {
          <li class="flex items-start gap-3 py-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-xs font-semibold text-brand-green"
            >
              {{ initials(donation.donorName) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate text-sm font-medium text-ink">
                  {{ donation.donorName }}
                  @if (donation.type === 'CORPORATE') {
                    <span
                      class="ml-1 rounded bg-brand-blue/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-blue"
                    >
                      Corporate
                    </span>
                  }
                </p>
                <span class="shrink-0 text-sm font-semibold text-ink">{{
                  donation.amountCents | money
                }}</span>
              </div>
              @if (donation.message) {
                <p class="mt-0.5 text-sm text-slate2">“{{ donation.message }}”</p>
              }
              <p class="mt-0.5 text-xs text-slate-400">{{ rel(donation.createdAt) }}</p>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="py-4 text-sm text-slate2">Be the first to support this student.</p>
    }
  `,
})
export class RecentDonorsComponent {
  @Input({ required: true }) donations: PublicDonation[] = [];

  rel(iso: string): string {
    return relativeTime(iso);
  }

  initials(name: string): string {
    return (name || '?')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
