import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { exportFilename, exportJson } from './account-security';
import { PrivacyPanelComponent } from './privacy-panel.component';

/**
 * Account & privacy page. Hosts the GDPR PrivacyPanel and performs the actual
 * API calls plus the browser file download. The panel stays presentational; the
 * page owns side effects (download, sign-out after anonymisation).
 */
@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [PrivacyPanelComponent],
  template: `
    <section class="mx-auto max-w-2xl px-4 py-10">
      <h1 class="mb-6 font-display text-2xl font-semibold text-ink">Account & privacy</h1>
      <app-privacy-panel
        [email]="email()"
        [anonymized]="anonymized()"
        [busy]="busy()"
        (exportRequested)="onExport()"
        (deleteRequested)="onDelete()"
      />
      @if (message()) {
        <p class="mt-4 text-sm text-slate2" role="status">{{ message() }}</p>
      }
    </section>
  `,
})
export class AccountPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly busy = signal(false);
  readonly anonymized = signal(false);
  readonly message = signal<string | null>(null);
  readonly email = signal(this.auth.user()?.email ?? '');

  onExport(): void {
    this.busy.set(true);
    this.api.exportMyData().subscribe({
      next: (data) => {
        this.download(data);
        this.busy.set(false);
        this.message.set('Your data export has been downloaded.');
      },
      error: () => {
        this.busy.set(false);
        this.message.set('Could not export your data. Please try again.');
      },
    });
  }

  onDelete(): void {
    this.busy.set(true);
    this.api.deleteMyAccount().subscribe({
      next: () => {
        this.anonymized.set(true);
        this.busy.set(false);
        this.message.set('Your account has been anonymised. Signing you out…');
        setTimeout(() => this.auth.logout(), 1500);
      },
      error: () => {
        this.busy.set(false);
        this.message.set('Could not delete your account. Please try again.');
      },
    });
  }

  private download(data: unknown): void {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFilename();
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
