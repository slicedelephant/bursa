import { Component, computed, input } from '@angular/core';
import { assessPasswordStrength } from '../../core/password-strength';

/**
 * Live password-strength meter for the register form. Presentational: takes the
 * current password as a signal input and renders a coloured bar, a label and the
 * concrete, fixable issues. All scoring lives in the pure `password-strength` util.
 */
@Component({
  selector: 'app-password-strength-meter',
  standalone: true,
  template: `
    @if (password()) {
      <div class="mt-2" data-testid="meter">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            class="h-1.5 rounded-full transition-all"
            [class]="strength().barClass"
            [style.width]="strength().widthPercent"
          ></div>
        </div>
        <p
          class="mt-1 text-xs font-semibold"
          [class.text-brand-green]="strength().valid"
          [class.text-slate2]="!strength().valid"
        >
          Password strength: {{ strength().label }}
        </p>
        @if (strength().issues.length) {
          <ul class="mt-1 space-y-0.5 text-xs text-slate2">
            @for (issue of strength().issues; track issue) {
              <li>• {{ issue }}</li>
            }
          </ul>
        }
      </div>
    }
  `,
})
export class PasswordStrengthMeterComponent {
  readonly password = input<string>('');
  readonly strength = computed(() => assessPasswordStrength(this.password()));
}
