import {
  WIZARD_STORAGE_KEY,
  WizardStorage,
  clearWizardState,
  emptyWizardState,
  loadWizardState,
  saveWizardState,
} from './campaign-wizard.storage';

function memoryStorage(initial: Record<string, string> = {}): WizardStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  };
}

describe('wizard storage', () => {
  it('round-trips state through save and load', () => {
    const storage = memoryStorage();
    const state = { ...emptyWizardState(), step: 2, title: 'Help me study' };
    saveWizardState(storage, state);
    expect(loadWizardState(storage)).toEqual(state);
  });

  it('merges a partial saved draft onto the defaults', () => {
    const storage = memoryStorage({
      [WIZARD_STORAGE_KEY]: JSON.stringify({ step: 3, videoUrl: 'x' }),
    });
    const loaded = loadWizardState(storage);
    expect(loaded?.step).toBe(3);
    expect(loaded?.videoUrl).toBe('x');
    expect(loaded?.schoolId).toBe('');
  });

  it('returns null when nothing is stored', () => {
    expect(loadWizardState(memoryStorage())).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    expect(
      loadWizardState(memoryStorage({ [WIZARD_STORAGE_KEY]: '{not json' })),
    ).toBeNull();
  });

  it('returns null when no storage is available', () => {
    expect(loadWizardState(null)).toBeNull();
  });

  it('clears the saved draft', () => {
    const storage = memoryStorage({ [WIZARD_STORAGE_KEY]: '{}' });
    clearWizardState(storage);
    expect(storage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('does not throw when saving/clearing without storage', () => {
    expect(() => saveWizardState(null, emptyWizardState())).not.toThrow();
    expect(() => clearWizardState(null)).not.toThrow();
  });

  it('survives a storage that throws on access', () => {
    const throwing: WizardStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadWizardState(throwing)).toBeNull();
    expect(() => saveWizardState(throwing, emptyWizardState())).not.toThrow();
    expect(() => clearWizardState(throwing)).not.toThrow();
  });
});
