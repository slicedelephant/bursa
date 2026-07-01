import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApplicationRow, ProgramSummary, ScholarRow } from '../../core/models';
import { AwardManagementComponent } from './award-management.component';
import { SrmDashboardComponent } from './srm-dashboard.component';

/**
 * E19 — corporate scholarship program admin. Create/brand a program, view
 * applications, decide winners (awards disburse to the school), and manage
 * scholars (SRM) + impact-report export. Reviewer scoring + the public
 * application form live on their own surfaces.
 */
@Component({
  selector: 'app-scholarship-admin-page',
  standalone: true,
  imports: [FormsModule, AwardManagementComponent, SrmDashboardComponent],
  template: `
    <section class="mx-auto max-w-5xl px-4 py-10">
      <header class="mb-8">
        <p class="text-sm font-medium text-brand-green">Enterprise scholarships</p>
        <h1 class="font-display text-3xl font-semibold text-ink">My Scholarship Programs</h1>
        <p class="mt-1 text-sm text-slate2">
          Run your own branded scholarship. Awards are disbursed directly to the verified school —
          never to the scholar.
        </p>
      </header>

      @if (!selected()) {
        <div class="mb-8 rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
          <h2 class="font-display text-lg font-semibold text-ink">Start a program</h2>
          <form class="mt-4 grid gap-3 sm:grid-cols-2" (ngSubmit)="create()">
            <input
              class="rounded-lg border border-mist px-3 py-2 text-sm"
              placeholder="Program name"
              name="name"
              [(ngModel)]="name"
            />
            <input
              class="rounded-lg border border-mist px-3 py-2 text-sm"
              placeholder="url-slug"
              name="slug"
              [(ngModel)]="slug"
            />
            <input
              class="rounded-lg border border-mist px-3 py-2 text-sm"
              type="number"
              placeholder="Budget (EUR)"
              name="budget"
              [(ngModel)]="budgetEur"
            />
            <input
              class="rounded-lg border border-mist px-3 py-2 text-sm"
              type="number"
              placeholder="Slots"
              name="slots"
              [(ngModel)]="slots"
            />
            <button
              type="submit"
              class="rounded-lg bg-brand-green px-3 py-2 text-sm text-white sm:col-span-2"
            >
              Create program
            </button>
          </form>
          @if (error()) {
            <p class="mt-3 text-sm text-brand-orange">{{ error() }}</p>
          }
        </div>

        <ul class="space-y-3">
          @for (p of programs(); track p.id) {
            <li
              class="flex cursor-pointer items-center justify-between rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5"
              (click)="open(p)"
            >
              <div>
                <p class="font-medium text-ink">{{ p.name }}</p>
                <p class="text-xs text-slate2">
                  {{ p.applicationCount }} applications · {{ p.awardCount }} awards
                </p>
              </div>
              <span
                class="h-6 w-6 rounded-full ring-2 ring-white"
                [style.background]="p.brandPrimary"
              ></span>
            </li>
          } @empty {
            <li class="text-sm text-slate2">No programs yet — create your first above.</li>
          }
        </ul>
      } @else {
        <button type="button" class="mb-4 text-sm text-brand-blue" (click)="selected.set(null)">
          ← All programs
        </button>
        <h2 class="font-display text-2xl font-semibold text-ink">
          {{ selected()!.name }}
        </h2>

        <div class="mt-6 grid gap-6">
          <app-award-management
            [applications]="applications()"
            (decide)="decide()"
          ></app-award-management>

          <app-srm-dashboard
            [scholars]="scholars()"
            (advance)="advance($event)"
            (message)="messageScholar($event)"
          ></app-srm-dashboard>

          <div class="flex gap-3">
            <button
              type="button"
              class="rounded-lg bg-ink px-3 py-2 text-sm text-white"
              (click)="downloadReport('csv')"
            >
              Export CSV
            </button>
            <button
              type="button"
              class="rounded-lg bg-ink px-3 py-2 text-sm text-white"
              (click)="downloadReport('pdf')"
            >
              Export PDF
            </button>
            <button
              type="button"
              class="rounded-lg bg-brand-blue px-3 py-2 text-sm text-white"
              (click)="renew()"
            >
              Renew for next year
            </button>
          </div>
          @if (notice()) {
            <p class="text-sm text-brand-green">{{ notice() }}</p>
          }
        </div>
      }
    </section>
  `,
})
export class ScholarshipAdminPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly programs = signal<ProgramSummary[]>([]);
  readonly selected = signal<ProgramSummary | null>(null);
  readonly applications = signal<ApplicationRow[]>([]);
  readonly scholars = signal<ScholarRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  name = '';
  slug = '';
  budgetEur = 60000;
  slots = 3;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listScholarshipPrograms().subscribe((programs) => this.programs.set(programs));
  }

  create(): void {
    this.error.set(null);
    this.api
      .createScholarshipProgram({
        name: this.name,
        slug: this.slug,
        year: new Date().getFullYear(),
        budgetCents: Math.round(this.budgetEur * 100),
        slots: this.slots,
        awardCents: Math.round((this.budgetEur * 100) / Math.max(this.slots, 1)),
      })
      .subscribe({
        next: () => {
          this.name = '';
          this.slug = '';
          this.load();
        },
        error: (err) => this.error.set(err?.error?.error ?? 'Could not create program'),
      });
  }

  open(program: ProgramSummary): void {
    this.selected.set(program);
    this.refresh();
  }

  refresh(): void {
    const id = this.selected()?.id;
    if (!id) {
      return;
    }
    this.api.listScholarshipApplications(id).subscribe((a) => this.applications.set(a));
    this.api.listScholars(id).subscribe((s) => this.scholars.set(s));
  }

  decide(): void {
    const program = this.selected();
    if (!program?.activeCycle) {
      return;
    }
    this.api
      .decideScholarshipAwards(program.id, program.activeCycle.year)
      .subscribe(() => this.refresh());
  }

  advance(event: {
    scholarId: string;
    event: 'enroll' | 'graduate' | 'employ' | 'withdraw';
  }): void {
    this.api.setScholarStatus(event.scholarId, event.event).subscribe(() => this.refresh());
  }

  messageScholar(scholarId: string): void {
    this.api
      .messageScholar(scholarId, 'WHATSAPP', 'A quick update from your scholarship program.')
      .subscribe(() => this.notice.set('Message sent (mock provider).'));
  }

  renew(): void {
    const id = this.selected()?.id;
    if (!id) {
      return;
    }
    this.api
      .renewScholarshipProgram(id, {})
      .subscribe((res) => this.notice.set(`Renewed for ${res.cycle.year}.`));
  }

  downloadReport(format: 'csv' | 'pdf'): void {
    const id = this.selected()?.id;
    if (!id) {
      return;
    }
    this.api.scholarshipReport(id, format).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scholarship-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
