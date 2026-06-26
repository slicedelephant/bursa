import { Component, Input } from '@angular/core';
import { CampaignUpdate } from '../../core/models';
import { relativeTime } from './relative-time';

@Component({
  selector: 'app-updates-timeline',
  standalone: true,
  template: `
    <ol class="relative ml-2 space-y-6 border-l border-slate-200 pl-6">
      @for (update of updates; track update.id) {
        <li class="relative">
          <span
            class="absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full ring-4 ring-white"
            [class.bg-brand-green]="update.type !== 'SYSTEM'"
            [class.bg-slate-300]="update.type === 'SYSTEM'"
          ></span>

          <div class="flex flex-wrap items-center gap-2">
            <h3
              class="font-display font-semibold"
              [class.text-ink]="update.type !== 'SYSTEM'"
              [class.text-slate2]="update.type === 'SYSTEM'"
            >
              {{ update.title }}
            </h3>
            @if (update.type === 'SYSTEM') {
              <span
                class="rounded-full bg-mist px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate2"
              >
                System
              </span>
            }
          </div>

          <p
            class="mt-1 whitespace-pre-line text-sm"
            [class.text-slate2]="update.type !== 'SYSTEM'"
            [class.text-slate-400]="update.type === 'SYSTEM'"
          >
            {{ update.body }}
          </p>
          <p class="mt-1 text-xs text-slate-400">{{ rel(update.createdAt) }}</p>
        </li>
      }
    </ol>
  `,
})
export class UpdatesTimelineComponent {
  @Input({ required: true }) updates: CampaignUpdate[] = [];

  rel(iso: string): string {
    return relativeTime(iso);
  }
}
