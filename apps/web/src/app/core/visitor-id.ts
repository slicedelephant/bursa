// Anonymous, persistent visitor id for product analytics. Pure over a minimal
// storage interface so it is testable without the DOM. The id is random and
// carries NO PII (never an IP, never an email) — it only lets us de-duplicate a
// returning browser within the funnel.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const VISITOR_ID_KEY = 'bursa_visitor_id';

const VALID = /^v_[A-Za-z0-9]{6,40}$/;

export function isVisitorId(value: unknown): value is string {
  return typeof value === 'string' && VALID.test(value);
}

export function generateVisitorId(rand: () => number = Math.random): string {
  const part = () => Math.floor(rand() * 1e12).toString(36);
  return `v_${part()}${part()}`.slice(0, 24);
}

/** Returns the stored visitor id, creating and persisting one on first use. */
export function getOrCreateVisitorId(
  storage: KeyValueStorage,
  generate: () => string = generateVisitorId,
): string {
  const existing = storage.getItem(VISITOR_ID_KEY);
  if (isVisitorId(existing)) return existing;
  const created = generate();
  storage.setItem(VISITOR_ID_KEY, created);
  return created;
}
