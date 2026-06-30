import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { SchoolWebhookLogItem } from '../../core/models';

/** Read-only log of outbound school webhook events (E8 stub emitter). */
@Component({
  selector: 'app-school-webhooks-panel',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <header class="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 class="font-display text-lg font-semibold text-ink">Webhook event log</h3>
          <p class="text-sm text-slate2">
            Events Bursa emits to your systems (logged in the prototype).
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-mist"
          (click)="load()"
        >
          Refresh
        </button>
      </header>

      @if (events().length === 0) {
        <p class="text-sm text-slate2">No events yet.</p>
      }
      <ul class="divide-y divide-slate-100">
        @for (e of events(); track e.id) {
          <li class="flex items-center justify-between gap-3 py-2.5">
            <span
              class="rounded-full bg-mist px-2.5 py-1 font-mono text-xs text-ink ring-1 ring-black/5"
              >{{ e.type }}</span
            >
            <span class="text-xs text-slate2">{{ e.createdAt | date: 'short' }}</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class SchoolWebhooksPanelComponent {
  private readonly api = inject(ApiService);
  readonly events = signal<SchoolWebhookLogItem[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.schoolWebhooks().subscribe({ next: (rows) => this.events.set(rows) });
  }
}
