/**
 * Pure variant cleaning + deterministic ranking for the coach's A/B output. No
 * I/O, no mutation, no imports.
 *
 * The provider returns several raw variants; this trims them, drops empty /
 * duplicate ones, ranks them deterministically (length inside the target window
 * first, then stable order) and marks exactly one recommendation. Determinism
 * keeps the tests reproducible and the UX predictable on refresh.
 */

export interface LengthWindow {
  readonly min: number;
  readonly max: number;
}

export interface RankedVariant {
  readonly text: string;
  readonly length: number;
  readonly recommended: boolean;
}

export interface RankResult {
  readonly variants: readonly RankedVariant[];
  readonly recommendedIndex: number;
}

/** Distance from the target window: 0 when inside, else chars outside. */
export function windowDistance(length: number, window: LengthWindow): number {
  if (length < window.min) {
    return window.min - length;
  }
  if (length > window.max) {
    return length - window.max;
  }
  return 0;
}

function dedupeTrimmed(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const text = (item ?? '').trim();
    if (text.length === 0) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(text);
  }
  return out;
}

/**
 * Clean + rank variants. Returns variants in their ORIGINAL (cleaned) order with
 * a `recommended` flag on the best one, plus its index. The recommended variant
 * is the one closest to the target window (ties broken by earliest position).
 * Empty input yields an empty result with recommendedIndex -1.
 */
export function rankVariants(
  raw: readonly string[],
  window: LengthWindow,
): RankResult {
  const cleaned = dedupeTrimmed(raw);
  if (cleaned.length === 0) {
    return { variants: [], recommendedIndex: -1 };
  }

  let bestIndex = 0;
  let bestDistance = windowDistance(cleaned[0].length, window);
  for (let i = 1; i < cleaned.length; i++) {
    const distance = windowDistance(cleaned[i].length, window);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  const variants = cleaned.map((text, i) => ({
    text,
    length: text.length,
    recommended: i === bestIndex,
  }));

  return { variants, recommendedIndex: bestIndex };
}
