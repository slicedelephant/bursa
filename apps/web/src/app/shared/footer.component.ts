import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="mt-16 border-t border-black/5 bg-white">
      <div class="mx-auto max-w-6xl px-4 py-10">
        <p class="font-display text-lg font-semibold text-ink">
          Bursa<span class="text-brand-orange">.</span>
        </p>
        <p class="mt-2 max-w-xl text-sm text-slate2">
          Funding that goes straight to the school — never to the student. Verified, admitted
          students from lower-income countries, funded by people and companies who believe in them.
        </p>
        <p class="mt-6 text-xs text-slate-400">
          Prototype · payments are simulated · synthetic demo data · &copy; 2026 Bursa
        </p>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
