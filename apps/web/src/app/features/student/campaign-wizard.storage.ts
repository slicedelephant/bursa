// Pure localStorage autosave for the campaign wizard ("Zwischenspeichern").
// Storage is injected as a minimal interface so it is testable without a DOM and
// degrades gracefully when localStorage is unavailable (private mode, SSR).

export interface WizardState {
  step: number;
  schoolId: string;
  programName: string;
  title: string;
  goalEur: number | null;
  deadline: string;
  background: string;
  challenge: string;
  vision: string;
  videoUrl: string;
}

export type WizardStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const WIZARD_STORAGE_KEY = 'bursa.campaign-wizard.v1';

export function emptyWizardState(): WizardState {
  return {
    step: 1,
    schoolId: '',
    programName: '',
    title: '',
    goalEur: null,
    deadline: '',
    background: '',
    challenge: '',
    vision: '',
    videoUrl: '',
  };
}

/** Read a saved draft, merged onto defaults; null when nothing valid is stored. */
export function loadWizardState(storage: WizardStorage | null): WizardState | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(WIZARD_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    if (!parsed || typeof parsed !== 'object') return null;
    return { ...emptyWizardState(), ...parsed };
  } catch {
    return null;
  }
}

export function saveWizardState(storage: WizardStorage | null, state: WizardState): void {
  if (!storage) return;
  try {
    storage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or unavailable — autosave is best-effort.
  }
}

export function clearWizardState(storage: WizardStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // ignore
  }
}
