import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Payload emitted when a sponsor saves their company profile. */
export interface CompanyProfileInput {
  companyName: string;
  sector?: string;
  contactName?: string;
  logoUrl?: string;
}

/**
 * First-run setup form shown when a sponsor has no corporate profile yet.
 * Collects the company details needed before impact can be tracked.
 */
@Component({
  selector: 'app-company-profile-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <h2 class="font-display text-xl font-semibold text-ink">Set up your company profile</h2>
      <p class="mt-1 text-sm text-slate2">
        Add your company details to start sponsoring students and tracking your impact.
      </p>

      <form (ngSubmit)="submit()" class="mt-6 space-y-4">
        <div>
          <label for="companyName" class="block text-sm font-medium text-ink">Company name</label>
          <input
            id="companyName"
            name="companyName"
            [(ngModel)]="companyName"
            required
            autocomplete="organization"
            placeholder="Acme GmbH"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
        </div>

        <div>
          <label for="sector" class="block text-sm font-medium text-ink">Sector <span class="text-slate2">(optional)</span></label>
          <input
            id="sector"
            name="sector"
            [(ngModel)]="sector"
            placeholder="Technology, Finance, …"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
        </div>

        <div>
          <label for="contactName" class="block text-sm font-medium text-ink">Contact name <span class="text-slate2">(optional)</span></label>
          <input
            id="contactName"
            name="contactName"
            [(ngModel)]="contactName"
            autocomplete="name"
            placeholder="Jane Doe"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
        </div>

        <div>
          <label for="logoUrl" class="block text-sm font-medium text-ink">Logo URL <span class="text-slate2">(optional)</span></label>
          <input
            id="logoUrl"
            name="logoUrl"
            type="url"
            [(ngModel)]="logoUrl"
            placeholder="https://example.com/logo.png"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
        </div>

        @if (error) {
          <p class="text-sm font-medium text-brand-orange">{{ error }}</p>
        }

        <button
          type="submit"
          [disabled]="saving || !companyName.trim()"
          class="rounded-lg bg-brand-green px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : 'Save profile' }}
        </button>
      </form>
    </div>
  `,
})
export class CompanyProfileFormComponent {
  @Input() saving = false;
  @Input() error: string | null = null;
  @Output() save = new EventEmitter<CompanyProfileInput>();

  companyName = '';
  sector = '';
  contactName = '';
  logoUrl = '';

  submit(): void {
    const companyName = this.companyName.trim();
    if (!companyName) return;

    const sector = this.sector.trim();
    const contactName = this.contactName.trim();
    const logoUrl = this.logoUrl.trim();

    this.save.emit({
      companyName,
      ...(sector ? { sector } : {}),
      ...(contactName ? { contactName } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    });
  }
}
