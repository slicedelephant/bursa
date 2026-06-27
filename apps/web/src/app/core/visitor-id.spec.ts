import {
  generateVisitorId,
  getOrCreateVisitorId,
  isVisitorId,
  KeyValueStorage,
  VISITOR_ID_KEY,
} from './visitor-id';

function memStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('visitor-id', () => {
  it('validates the id shape', () => {
    expect(isVisitorId('v_abc123')).toBe(true);
    expect(isVisitorId('nope')).toBe(false);
    expect(isVisitorId(undefined)).toBe(false);
  });

  it('generates a valid, prefixed id', () => {
    const id = generateVisitorId(() => 0.42);
    expect(isVisitorId(id)).toBe(true);
    expect(id.startsWith('v_')).toBe(true);
  });

  it('creates and persists an id on first use', () => {
    const storage = memStorage();
    const id = getOrCreateVisitorId(storage, () => 'v_created01');
    expect(id).toBe('v_created01');
    expect(storage.data[VISITOR_ID_KEY]).toBe('v_created01');
  });

  it('reuses a previously stored id', () => {
    const storage = memStorage({ [VISITOR_ID_KEY]: 'v_existing9' });
    const gen = jest.fn(() => 'v_new0000000');
    const id = getOrCreateVisitorId(storage, gen);
    expect(id).toBe('v_existing9');
    expect(gen).not.toHaveBeenCalled();
  });

  it('replaces a corrupt stored value', () => {
    const storage = memStorage({ [VISITOR_ID_KEY]: 'garbage value' });
    const id = getOrCreateVisitorId(storage, () => 'v_fresh00001');
    expect(id).toBe('v_fresh00001');
  });
});
