import { DatePipe } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { SchoolPortalProfile } from '../../core/models';

/** Payout-data self-service + mock e-signature of the funding agreement. */
@Component({
  selector: 'app-school-payout-form',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="grid gap-6 lg:grid-cols-2">
      <form
        class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5"
        (ngSubmit)="savePayout()"
      >
        <h3 class="font-display text-lg font-semibold text-ink">Payout & tax details</h3>
        <p class="mt-1 text-sm text-slate2">
          Funds are always paid directly to the school, never to the student.
        </p>

        <div class="mt-4 space-y-3">
          <input
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Bank account name"
            [(ngModel)]="bankAccountName"
            name="bankAccountName"
          />
          <input
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            [placeholder]="ibanPlaceholder()"
            [(ngModel)]="iban"
            name="iban"
          />
          <input
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="BIC (optional)"
            [(ngModel)]="bic"
            name="bic"
          />
          <input
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Tax ID"
            [(ngModel)]="taxId"
            name="taxId"
          />
          <input
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Contact person"
            [(ngModel)]="contactName"
            name="contactName"
          />
          <input
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Contact email"
            [(ngModel)]="contactEmail"
            name="contactEmail"
          />
        </div>

        <button
          type="submit"
          class="mt-4 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          [disabled]="busy()"
        >
          Save payout details
        </button>
      </form>

      <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
        <h3 class="font-display text-lg font-semibold text-ink">Funding agreement</h3>
        @if (signedAt(); as at) {
          <p class="mt-2 rounded-lg bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
            Signed by {{ signerOnFile() }} on {{ at | date: 'mediumDate' }}.
          </p>
        } @else {
          <p class="mt-1 text-sm text-slate2">
            Sign the partner funding agreement to activate the portal (mock e-signature).
          </p>
          <input
            class="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Your full name (signature)"
            [(ngModel)]="signerName"
          />
          <button
            type="button"
            class="mt-3 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            [disabled]="busy() || signerName().trim().length < 2"
            (click)="sign()"
          >
            Sign agreement
          </button>
        }
        @if (error()) {
          <p
            class="mt-3 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange"
            role="alert"
          >
            {{ error() }}
          </p>
        }
        @if (notice()) {
          <p class="mt-3 rounded-lg bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
            {{ notice() }}
          </p>
        }
      </div>
    </div>
  `,
})
export class SchoolPayoutFormComponent {
  private readonly api = inject(ApiService);
  readonly changed = output<void>();

  readonly bankAccountName = signal('');
  readonly iban = signal('');
  readonly bic = signal('');
  readonly taxId = signal('');
  readonly contactName = signal('');
  readonly contactEmail = signal('');
  readonly signerName = signal('');

  readonly ibanMasked = signal<string | null>(null);
  readonly signedAt = signal<string | null>(null);
  readonly signerOnFile = signal<string>('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.schoolMe().subscribe({
      next: (me: SchoolPortalProfile) => {
        const s = me.school;
        this.bankAccountName.set(s.bankAccountName ?? '');
        this.bic.set(s.bic ?? '');
        this.taxId.set(s.taxId ?? '');
        this.contactName.set(s.contactName ?? '');
        this.contactEmail.set(s.contactEmail ?? '');
        this.ibanMasked.set(s.ibanMasked ?? null);
        this.signedAt.set(me.onboarding.agreementSignedAt ?? null);
        this.signerOnFile.set(me.onboarding.agreementSignerName ?? 'the school');
      },
      error: () => this.error.set('Could not load payout details.'),
    });
  }

  ibanPlaceholder(): string {
    return this.ibanMasked() ? `IBAN on file (${this.ibanMasked()})` : 'IBAN';
  }

  savePayout(): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api
      .schoolSavePayout({
        bankAccountName: this.bankAccountName(),
        iban: this.iban(),
        bic: this.bic() || undefined,
        taxId: this.taxId(),
        contactName: this.contactName(),
        contactEmail: this.contactEmail(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notice.set('Payout details saved.');
          this.changed.emit();
          this.load();
        },
        error: (err) => {
          this.error.set(this.message(err));
          this.busy.set(false);
        },
      });
  }

  sign(): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.schoolSignAgreement({ signerName: this.signerName() }).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set('Agreement signed — your portal is now active.');
        this.changed.emit();
        this.load();
      },
      error: (err) => {
        this.error.set(this.message(err));
        this.busy.set(false);
      },
    });
  }

  private message(err: { error?: { error?: { message?: string } } }): string {
    return err?.error?.error?.message ?? 'Something went wrong';
  }
}
