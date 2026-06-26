import { Component } from '@angular/core';

interface Step {
  readonly num: number;
  readonly title: string;
  readonly body: string;
}

const STEPS: readonly Step[] = [
  {
    num: 1,
    title: 'Admitted',
    body: 'A student is accepted into a business-school program and starts a campaign.',
  },
  {
    num: 2,
    title: 'Verified',
    body: 'We verify the admission and the school payout account before the campaign goes live.',
  },
  {
    num: 3,
    title: 'Funded',
    body: 'Donors and sponsors contribute. The money is paid directly to the school.',
  },
];

/** Three-step explainer for the funding flow. */
@Component({
  selector: 'app-how-it-works',
  standalone: true,
  template: `
    <div>
      <h2 class="font-display text-2xl font-bold text-ink">How it works</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-3">
        @for (step of steps; track step.num) {
          <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 font-display text-lg font-bold text-brand-green">
              {{ step.num }}
            </div>
            <h3 class="mt-4 font-display text-lg font-semibold text-ink">{{ step.title }}</h3>
            <p class="mt-2 text-sm text-slate2">{{ step.body }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class HowItWorksComponent {
  readonly steps = STEPS;
}
