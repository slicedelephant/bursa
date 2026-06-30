import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AdmissionImportResult, AdmissionRecord, VerificationStatus } from '../../core/models';
import { admissionStatusClass, admissionStatusLabel, importSummary } from './admission-status';

/** Student verification: import an admission list, then verify/reject each row. */
@Component({
  selector: 'app-school-student-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h3 class="font-display text-lg font-semibold text-ink">Import admission list</h3>
        <p class="mt-1 text-sm text-slate2">
          Paste a CSV with the header <code>email,name,program,admissionRef</code>.
        </p>
        <textarea
          [(ngModel)]="csv"
          rows="4"
          class="mt-3 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs"
          placeholder="email,name,program,admissionRef&#10;noor@school.test,Noor Hassan,MBA 2026,ADM-NOOR"
        ></textarea>
        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            [disabled]="busy() || csv().trim().length === 0"
            (click)="import()"
          >
            Import
          </button>
          @if (lastImport(); as r) {
            <span class="text-sm text-slate2">{{ summary(r) }}</span>
          }
        </div>
        @if (lastImport()?.errors?.length) {
          <ul class="mt-2 list-inside list-disc text-xs text-brand-orange">
            @for (e of lastImport()!.errors; track e.line) {
              <li>Line {{ e.line }}: {{ e.message }}</li>
            }
          </ul>
        }
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <header class="mb-4 flex items-center justify-between gap-4">
          <h3 class="font-display text-lg font-semibold text-ink">Admissions</h3>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-mist"
            (click)="load()"
          >
            Refresh
          </button>
        </header>

        @if (error()) {
          <p
            class="mb-3 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange"
            role="alert"
          >
            {{ error() }}
          </p>
        }
        @if (records().length === 0) {
          <p class="text-sm text-slate2">No admission records yet — import a list above.</p>
        }

        <ul class="divide-y divide-slate-100">
          @for (r of records(); track r.id) {
            <li class="py-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-ink">{{ r.studentName }}</p>
                  <p class="truncate text-xs text-slate2">
                    {{ r.admissionRef }} · {{ r.programName }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                    [class]="statusCls(r.status)"
                  >
                    {{ statusLabel(r.status) }}
                  </span>
                  @if (r.status === 'PENDING') {
                    <button
                      type="button"
                      class="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      [disabled]="busyId() === r.id"
                      (click)="verify(r)"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-mist disabled:opacity-50"
                      [disabled]="busyId() === r.id"
                      (click)="rejectingId.set(r.id)"
                    >
                      Reject
                    </button>
                  }
                </div>
              </div>
              @if (rejectingId() === r.id) {
                <div class="mt-2 flex items-center gap-2">
                  <input
                    [(ngModel)]="rejectNote"
                    class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    placeholder="Reason (required)"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white"
                    (click)="reject(r)"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                    (click)="cancelReject()"
                  >
                    Cancel
                  </button>
                </div>
              }
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class SchoolStudentListComponent {
  private readonly api = inject(ApiService);
  readonly changed = output<void>();

  readonly records = signal<AdmissionRecord[]>([]);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly csv = signal('');
  readonly lastImport = signal<AdmissionImportResult | null>(null);
  readonly rejectingId = signal<string | null>(null);
  readonly rejectNote = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.api.schoolAdmissions().subscribe({
      next: (rows) => this.records.set(rows),
      error: () => this.error.set('Could not load admissions.'),
    });
  }

  import(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.schoolImportAdmissions(this.csv()).subscribe({
      next: (result) => {
        this.lastImport.set(result);
        this.busy.set(false);
        this.csv.set('');
        this.load();
      },
      error: (err) => {
        this.error.set(this.message(err));
        this.busy.set(false);
      },
    });
  }

  verify(r: AdmissionRecord): void {
    this.busyId.set(r.id);
    this.api.schoolVerifyAdmission(r.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.changed.emit();
        this.load();
      },
      error: (err) => {
        this.error.set(this.message(err));
        this.busyId.set(null);
      },
    });
  }

  reject(r: AdmissionRecord): void {
    const note = this.rejectNote().trim();
    if (!note) return;
    this.busyId.set(r.id);
    this.api.schoolRejectAdmission(r.id, note).subscribe({
      next: () => {
        this.busyId.set(null);
        this.cancelReject();
        this.changed.emit();
        this.load();
      },
      error: (err) => {
        this.error.set(this.message(err));
        this.busyId.set(null);
      },
    });
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectNote.set('');
  }

  statusLabel(status: VerificationStatus): string {
    return admissionStatusLabel(status);
  }

  statusCls(status: VerificationStatus): string {
    return admissionStatusClass(status);
  }

  summary(result: AdmissionImportResult): string {
    return importSummary(result);
  }

  private message(err: { error?: { error?: { message?: string } } }): string {
    return err?.error?.error?.message ?? 'Something went wrong';
  }
}
