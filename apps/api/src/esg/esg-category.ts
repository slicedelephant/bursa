/**
 * E14 ESG/CSRD — pure ESG-category validation + labelling + distribution. No I/O,
 * no mutation (Constitution IV). Tagging is additive on the append-only ledger;
 * this core only validates the category and aggregates tag counts.
 */

import { EsgCategory } from '@prisma/client';

export const ESG_CATEGORIES: readonly EsgCategory[] = [
  'QUALITY_EDUCATION',
  'GENDER_EQUALITY',
  'GEOGRAPHIC_REACH',
  'POVERTY_REDUCTION',
  'ECONOMIC_GROWTH',
];

const LABELS: Record<EsgCategory, string> = {
  QUALITY_EDUCATION: 'Quality Education',
  GENDER_EQUALITY: 'Gender Equality',
  GEOGRAPHIC_REACH: 'Geographic Reach',
  POVERTY_REDUCTION: 'Poverty Reduction',
  ECONOMIC_GROWTH: 'Economic Growth',
};

/** Type guard: is `value` a valid ESG category? */
export function isEsgCategory(value: unknown): value is EsgCategory {
  return (
    typeof value === 'string' &&
    (ESG_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Parse a category at the boundary. Returns the typed value, or throws a plain
 * Error (mapped to a 400 by the controller/DTO layer) for an invalid input.
 */
export function parseEsgCategory(value: unknown): EsgCategory {
  if (!isEsgCategory(value)) {
    throw new Error('category must be a valid EsgCategory');
  }
  return value;
}

/** Human-readable label for a category. */
export function esgCategoryLabel(category: EsgCategory): string {
  return LABELS[category];
}

/**
 * Count tagged entries per category. Returns every category (zero-filled) so the
 * report shape is stable regardless of which categories happen to be present.
 */
export function categoryDistribution(
  tagged: ReadonlyArray<{ category: EsgCategory }>,
): Record<EsgCategory, number> {
  const base = ESG_CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c]: 0 }),
    {} as Record<EsgCategory, number>,
  );
  return tagged.reduce(
    (acc, t) => ({ ...acc, [t.category]: acc[t.category] + 1 }),
    base,
  );
}
