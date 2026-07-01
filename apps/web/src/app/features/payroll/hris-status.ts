import { HrisConnectionStatus, HrisProvider } from '../../core/models';

/**
 * E21 — pure presentation helpers for the HRIS connection status. No I/O; returns
 * new values, never mutates inputs. Mirrors the backend connection lifecycle.
 */

const PROVIDER_LABELS: Record<HrisProvider, string> = {
  MOCK: 'Mock HRIS',
  ADP: 'ADP Workforce Now',
  WORKDAY: 'Workday',
  PAYCHEX: 'Paychex',
  PAYLOCITY: 'Paylocity',
  UKG: 'UKG',
  BAMBOOHR: 'BambooHR',
};

const STATUS_TONE: Record<HrisConnectionStatus, string> = {
  PENDING: 'slate',
  CONNECTED: 'blue',
  SYNCED: 'green',
  REVOKED: 'orange',
  ERROR: 'orange',
};

/** The human label for an HRIS provider (defaults to the raw code). */
export function providerLabel(provider: HrisProvider): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** A colour tone key for a status badge (maps to Tailwind classes in the view). */
export function statusTone(status: HrisConnectionStatus): string {
  return STATUS_TONE[status] ?? 'slate';
}

/** True when a connection can be synced (CONNECTED or already SYNCED). */
export function canSync(status: HrisConnectionStatus): boolean {
  return status === 'CONNECTED' || status === 'SYNCED';
}

/** A short human sentence describing the connection state. */
export function statusHeadline(provider: HrisProvider, status: HrisConnectionStatus): string {
  const label = providerLabel(provider);
  switch (status) {
    case 'SYNCED':
      return `${label} connected and synced`;
    case 'CONNECTED':
      return `${label} connected — run a sync to import employees`;
    case 'ERROR':
      return `${label} connection error`;
    case 'REVOKED':
      return `${label} access revoked`;
    default:
      return `${label} connection pending`;
  }
}
