/**
 * E13 Employer-Matching — pure view mappers + apply-URL builder.
 *
 * Turns programs, computations and claim rows into the API view shapes. Also
 * substitutes the pre-filled application URL template. No I/O, no mutation.
 */

import { MatchClaimStatus, statusLabel } from './claim-status';
import { MatchProgram } from './employer-match-lookup';
import { Locale, OfferLabels } from './match-labels';

export interface MatchOfferView {
  eligible: boolean;
  employerName?: string;
  domain?: string;
  matchRatio?: number;
  matchCents?: number;
  remainingAnnualCents?: number;
  annualCapCents?: number;
  integrationLevel?: 'AUTO_SUBMIT' | 'PORTAL' | 'MANUAL';
  capped?: boolean;
  labels: OfferLabels;
}

export interface MatchClaimRow {
  id: string;
  status: MatchClaimStatus;
  employerName: string;
  matchCents: number;
  campaignId: string;
  applyUrl: string | null;
  pdfRef: string | null;
}

export interface MatchClaimView {
  id: string;
  status: MatchClaimStatus;
  statusLabel: string;
  employerName: string;
  matchCents: number;
  campaignId: string;
  applyUrl?: string;
  hasPdf: boolean;
  documentUrl?: string;
  remainingAnnualCents?: number;
  labels: { headline: string; status: string };
}

/** A claim joined with its campaign + school, for the balance history list. */
export interface BalanceClaimRow {
  id: string;
  employerName: string;
  matchCents: number;
  status: MatchClaimStatus;
  campaignTitle: string;
  schoolName: string;
  createdAt: Date;
}

export interface MatchBalanceView {
  employerName?: string;
  domain?: string;
  year: number;
  annualCapCents?: number;
  usedCents: number;
  remainingAnnualCents?: number;
  claims: {
    id: string;
    employerName: string;
    matchCents: number;
    status: MatchClaimStatus;
    statusLabel: string;
    campaignTitle: string;
    schoolName: string;
    createdAt: string;
  }[];
}

const EMPTY_LABELS: OfferLabels = { headline: '', cta: '', balance: '' };

/** A "no match available" offer view (unknown employer or no balance). */
export function ineligibleOffer(
  labels: OfferLabels = EMPTY_LABELS,
): MatchOfferView {
  return { eligible: false, labels };
}

/** Build the eligible offer view from a program + computed match + labels. */
export function buildOfferView(
  program: MatchProgram,
  matchCents: number,
  remainingAnnualCents: number,
  capped: boolean,
  labels: OfferLabels,
): MatchOfferView {
  return {
    eligible: true,
    employerName: program.employerName,
    domain: program.domain,
    matchRatio: program.matchRatio,
    matchCents,
    remainingAnnualCents,
    annualCapCents: program.annualCapCents,
    integrationLevel: program.integrationLevel,
    capped,
    labels,
  };
}

/**
 * Substitute the pre-filled application URL template. Replaces `{amount}` (in
 * whole EUR) and `{employer}` (URL-encoded). Returns null when no template.
 */
export function buildApplyUrl(
  template: string | null | undefined,
  matchCents: number,
  employerName: string,
): string | null {
  if (!template) return null;
  return template
    .replace(/\{amount\}/g, String(Math.round(matchCents / 100)))
    .replace(/\{employer\}/g, encodeURIComponent(employerName));
}

/** Build the claim view returned after a successful claim. */
export function buildClaimView(
  row: MatchClaimRow,
  headline: string,
  remainingAnnualCents?: number,
): MatchClaimView {
  const hasPdf = row.pdfRef !== null && row.pdfRef !== undefined;
  return {
    id: row.id,
    status: row.status,
    statusLabel: statusLabel(row.status),
    employerName: row.employerName,
    matchCents: row.matchCents,
    campaignId: row.campaignId,
    applyUrl: row.applyUrl ?? undefined,
    hasPdf,
    documentUrl: hasPdf
      ? `/api/matching/me/claims/${row.id}/document`
      : undefined,
    remainingAnnualCents,
    labels: { headline, status: statusLabel(row.status) },
  };
}

/** Build the balance + history view for the donor account. */
export function buildBalanceView(input: {
  employerName?: string | null;
  domain?: string | null;
  year: number;
  annualCapCents?: number | null;
  usedCents: number;
  claims: BalanceClaimRow[];
}): MatchBalanceView {
  const cap = input.annualCapCents ?? undefined;
  const remaining =
    cap === undefined ? undefined : Math.max(0, cap - input.usedCents);
  return {
    employerName: input.employerName ?? undefined,
    domain: input.domain ?? undefined,
    year: input.year,
    annualCapCents: cap,
    usedCents: input.usedCents,
    remainingAnnualCents: remaining,
    claims: input.claims.map((c) => ({
      id: c.id,
      employerName: c.employerName,
      matchCents: c.matchCents,
      status: c.status,
      statusLabel: statusLabel(c.status),
      campaignTitle: c.campaignTitle,
      schoolName: c.schoolName,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export type { Locale };
