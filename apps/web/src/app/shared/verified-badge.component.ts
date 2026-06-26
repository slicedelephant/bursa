import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-verified-badge',
  standalone: true,
  template: `
    @if (verified) {
      <span
        class="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold text-brand-green"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
            clip-rule="evenodd"
          />
        </svg>
        Verified admission
      </span>
    }
  `,
})
export class VerifiedBadgeComponent {
  @Input() verified = false;
}
