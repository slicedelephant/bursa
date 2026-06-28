import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Presentational cookie/analytics consent banner. Shown only while a decision is
 * pending; emits accept/decline so the host (App) can persist it via the
 * AnalyticsService. No tracking happens until the visitor accepts.
 */
@Component({
  selector: 'app-consent-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div
        class="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/95 px-4 py-4 shadow-card backdrop-blur"
        role="dialog"
        aria-label="Analytics consent"
      >
        <div
          class="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-slate2">
            We use privacy-friendly, anonymous analytics (no IP, no personal data)
            to understand which campaigns reach their goal and where donors drop
            off. Help us improve Bursa?
          </p>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
              (click)="declined.emit()"
            >
              Decline
            </button>
            <button
              type="button"
              class="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90"
              (click)="accepted.emit()"
            >
              Accept analytics
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConsentBannerComponent {
  readonly visible = input(false);
  readonly accepted = output<void>();
  readonly declined = output<void>();
}
