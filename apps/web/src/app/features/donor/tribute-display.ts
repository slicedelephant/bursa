import { TributeType } from '../../core/models';

/**
 * Frontend mirror of the backend tribute line. A tribute renders only when both
 * a type and a non-empty name are present. Pure; returns a new string or null.
 */
export function tributeLine(type?: TributeType | null, name?: string | null): string | null {
  const trimmed = (name ?? '').trim();
  if (!type || !trimmed) return null;
  return type === 'MEMORY' ? `In memory of ${trimmed}` : `In honour of ${trimmed}`;
}
