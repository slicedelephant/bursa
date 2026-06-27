import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/analytics.service';
import { ConsentBannerComponent } from './shared/consent-banner.component';
import { FooterComponent } from './shared/footer.component';
import { NavbarComponent } from './shared/navbar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ConsentBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly analytics = inject(AnalyticsService);

  /** Reactive: re-evaluates when the consent signal changes (banner hides on choice). */
  readonly showConsent = computed(() => this.analytics.needsDecision());

  acceptConsent(): void {
    this.analytics.grantConsent();
  }

  declineConsent(): void {
    this.analytics.denyConsent();
  }
}
