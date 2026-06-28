import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toEmbed } from './video-embed';

/**
 * Renders a campaign pitch video as a responsive 16:9 embed. The URL is parsed
 * and host-validated by `toEmbed` (YouTube/Vimeo only), so the iframe source is
 * never an arbitrary user URL. Renders nothing when there is no valid video.
 */
@Component({
  selector: 'app-campaign-video',
  standalone: true,
  template: `
    @if (safeSrc(); as src) {
      <div class="overflow-hidden rounded-2xl bg-black shadow-card ring-1 ring-black/5">
        <div class="relative w-full" style="aspect-ratio: 16 / 9">
          <iframe
            class="absolute inset-0 h-full w-full"
            [src]="src"
            title="Campaign pitch video"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    }
  `,
})
export class CampaignVideoComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly videoUrl = input<string | null>(null);

  private readonly embed = computed(() => toEmbed(this.videoUrl()));

  readonly safeSrc = computed<SafeResourceUrl | null>(() => {
    const e = this.embed();
    return e ? this.sanitizer.bypassSecurityTrustResourceUrl(e.embedUrl) : null;
  });
}
