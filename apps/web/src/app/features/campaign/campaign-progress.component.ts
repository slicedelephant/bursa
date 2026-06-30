import { Component, computed, input } from '@angular/core';
import { MoneyPipe } from '../../core/money.pipe';
import { CampaignStatus } from '../../core/models';
import { deadlineInfo, milestoneLabel, percentToGoal, remainingCents } from './goal-math';

/**
 * All-or-Nothing goal mechanic: remaining amount, the 80/90% milestone push,
 * the countdown to study start, and the trust message that the donor is only
 * charged once the full goal is reached.
 */
@Component({
  selector: 'app-campaign-progress',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <div class="rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <div class="h-2 w-full overflow-hidden rounded-full bg-mist">
        <div
          class="h-full rounded-full bg-brand-green transition-[width]"
          [style.width.%]="percent()"
          [attr.aria-valuenow]="percent()"
          role="progressbar"
        ></div>
      </div>

      <div class="mt-3 flex items-baseline justify-between">
        <span class="font-display text-2xl font-semibold text-ink">{{
          raisedCents() | money
        }}</span>
        <span class="text-sm text-slate2">of {{ goalCents() | money }}</span>
      </div>

      @if (funded()) {
        <p class="mt-2 text-sm font-semibold text-brand-green">
          Goal reached — tuition is on its way directly to the school.
        </p>
      } @else {
        <p class="mt-2 text-sm text-ink">
          <span class="font-semibold">{{ remaining() | money }}</span> still to go
        </p>
        @if (milestoneText(); as ml) {
          <p
            class="mt-2 inline-block rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange"
          >
            {{ ml }}
          </p>
        }
      }

      @if (deadlineMeta(); as d) {
        @if (d.passed) {
          <p class="mt-3 text-sm text-slate2">The study-start deadline has passed.</p>
        } @else {
          <p
            class="mt-3 text-sm"
            [class.font-semibold]="d.urgent"
            [class.text-brand-orange]="d.urgent"
            [class.text-slate2]="!d.urgent"
          >
            {{ d.daysLeft }} day{{ d.daysLeft === 1 ? '' : 's' }} left until studies begin
          </p>
        }
      }

      <p class="mt-4 rounded-lg bg-mist px-3 py-2 text-xs text-slate2">
        All-or-Nothing: your card is only charged when the full tuition goal is reached. If the goal
        is missed, you are never charged.
      </p>
    </div>
  `,
})
export class CampaignProgressComponent {
  readonly raisedCents = input.required<number>();
  readonly goalCents = input.required<number>();
  readonly currency = input<string>('EUR');
  readonly status = input.required<CampaignStatus>();
  readonly deadline = input<string | null>(null);

  readonly percent = computed(() => percentToGoal(this.raisedCents(), this.goalCents()));
  readonly remaining = computed(() => remainingCents(this.raisedCents(), this.goalCents()));
  readonly funded = computed(
    () => this.status() === 'FUNDED' || this.status() === 'DISBURSED' || this.remaining() === 0,
  );
  readonly milestoneText = computed(() => (this.funded() ? null : milestoneLabel(this.percent())));
  readonly deadlineMeta = computed(() => deadlineInfo(this.deadline()));
}
