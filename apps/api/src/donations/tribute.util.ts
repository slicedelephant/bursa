import { TributeType } from '@prisma/client';

/**
 * Pure tribute (dedication) helpers. A tribute is valid only when BOTH a type
 * and a non-empty name are present — type and name belong together. Returns new
 * values; never mutates inputs.
 */
export interface TributeInput {
  readonly type?: TributeType | null;
  readonly name?: string | null;
}

export interface Tribute {
  readonly type: TributeType;
  readonly name: string;
}

export function normalizeTribute(input: TributeInput): Tribute | null {
  const type = input.type ?? null;
  const name = (input.name ?? '').trim();
  if (!type || !name) return null;
  return { type, name };
}

/** Human-facing dedication line, or null when there is no valid tribute. */
export function tributeLine(
  type?: TributeType | null,
  name?: string | null,
): string | null {
  const t = normalizeTribute({ type, name });
  if (!t) return null;
  return t.type === 'MEMORY' ? `In memory of ${t.name}` : `In honour of ${t.name}`;
}

/** True when exactly one of type/name is set — an invalid half-filled tribute. */
export function isPartialTribute(input: TributeInput): boolean {
  const hasType = !!input.type;
  const hasName = !!(input.name ?? '').trim();
  return hasType !== hasName;
}
