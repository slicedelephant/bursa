// Pure presentation helpers for school onboarding state (E8). No Angular, no I/O;
// returns new values, never mutates. Mirrors the backend onboarding-status util.

export type OnboardStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ACTIVE';

const ORDER: OnboardStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'ACTIVE'];

const STATUS_LABELS: Record<OnboardStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  ACTIVE: 'Active',
};

export function onboardingStatusLabel(status: OnboardStatus): string {
  return STATUS_LABELS[status] ?? 'Unknown';
}

export function onboardingStatusClass(status: OnboardStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-brand-green/10 text-brand-green ring-brand-green/30';
    case 'SUBMITTED':
      return 'bg-brand-blue/10 text-brand-blue ring-brand-blue/30';
    case 'IN_PROGRESS':
      return 'bg-amber-50 text-amber-700 ring-amber-300';
    default:
      return 'bg-slate-100 text-slate2 ring-slate-300';
  }
}

/** 0-based index of the status in the onboarding order (ACTIVE = 3). */
export function onboardingStageIndex(status: OnboardStatus): number {
  const idx = ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

export interface ChecklistStep {
  readonly key: string;
  readonly label: string;
  readonly done: boolean;
}

export function checklistProgressPct(steps: readonly ChecklistStep[]): number {
  if (steps.length === 0) return 0;
  const done = steps.filter((step) => step.done).length;
  return Math.round((done / steps.length) * 100);
}

export function isOnboardingComplete(status: OnboardStatus): boolean {
  return status === 'ACTIVE';
}
