// Pure presentation helpers for the Trust-and-Safety console. No Angular, no I/O.

import { TrustRiskLevel } from '../../../core/models';

/** Formats integer cents as a EUR string, e.g. 150000 → "€1,500.00". */
export function formatEur(cents: number): string {
  const eur = (cents ?? 0) / 100;
  return `€${eur.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Rounds a percentage to one decimal, e.g. 1.49 → "1.5%". */
export function formatPct(value: number): string {
  return `${Math.round((value ?? 0) * 10) / 10}%`;
}

/** Title-cases a risk level, e.g. HIGH → "High". */
export function riskLevelLabel(level: TrustRiskLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/** Tailwind chip classes for a risk level (green → amber → orange). */
export function riskLevelClass(level: TrustRiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-brand-orange/15 text-brand-orange ring-brand-orange/30';
    case 'HIGH':
      return 'bg-amber-100 text-amber-800 ring-amber-300';
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    default:
      return 'bg-mist text-slate2 ring-black/10';
  }
}

/** A clamped 0-100 score as a CSS width string for a score bar. */
export function scoreBarWidth(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  return `${clamped}%`;
}
