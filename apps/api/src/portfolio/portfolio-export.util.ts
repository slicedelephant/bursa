import { PortfolioView } from './portfolio.types';

/**
 * Pure CSV/PDF serialisation for the donor portfolio export — no I/O. The PDF lines
 * are handed to the shared E5 `buildSimplePdf` writer (no new library). CSV uses a
 * local RFC-4180-ish `cell()` escaping, mirroring `corporate/esg.util.ts`, so the
 * portfolio module stays decoupled from the corporate module. Returns new strings;
 * never mutates inputs.
 */

const CSV_HEADER = [
  'Student',
  'Country',
  'School',
  'Campaign',
  'Progress (%)',
  'Your contribution (EUR)',
  'Verified',
];

function eur(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** RFC-4180-ish escaping: wrap in quotes and double inner quotes when needed. */
function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toPortfolioCsv(view: PortfolioView): string {
  const lines = [CSV_HEADER.join(',')];
  for (const item of view.items) {
    lines.push(
      [
        cell(item.studentName),
        cell(item.country),
        cell(item.schoolName),
        cell(item.campaignTitle),
        String(item.percent),
        eur(item.yourContributionCents),
        item.verified ? 'Yes' : 'No',
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}

export function portfolioPdfLines(view: PortfolioView): string[] {
  const { streak, badge, stats } = view;
  return [
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Current streak: ${streak.currentMonths} months`,
    `Longest streak: ${streak.longestMonths} months`,
    `Badge: ${badge.tier}`,
    badge.nextTier
      ? `Next badge: ${badge.nextTier} in ${badge.monthsToNextTier} months`
      : 'Next badge: top tier reached',
    '',
    `Students supported: ${stats.distinctTargets}`,
    `Donations: ${stats.contributionCount}`,
    `Total given: EUR ${eur(stats.totalCents)}`,
    `Impact per student: EUR ${eur(stats.impactPerTargetCents)}`,
    '',
    'My students:',
    ...view.items.map(
      (item) =>
        `- ${item.studentName} (${item.country}), ${item.schoolName}: ` +
        `EUR ${eur(item.yourContributionCents)} given, campaign ${item.percent}% funded`,
    ),
  ];
}
