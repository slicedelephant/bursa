import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        class="h-full rounded-full bg-brand-green transition-all duration-500"
        [style.width.%]="clamped"
      ></div>
    </div>
  `,
})
export class ProgressBarComponent {
  @Input() percent = 0;

  get clamped(): number {
    return Math.max(0, Math.min(100, this.percent));
  }
}
