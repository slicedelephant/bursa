/**
 * E19 — Scholarship Program Manager: pure award-decision calculator.
 *
 * Ranks applications by consensus score and selects winners until the budget or
 * the slot count is exhausted. Ties break deterministically by appId so the same
 * input always yields the same winners. No I/O; returns new objects, never
 * mutates inputs.
 */

export interface RankedApplication {
  readonly appId: string;
  readonly consensusScore: number;
}

export interface AwardDecisionInput {
  readonly ranked: readonly RankedApplication[];
  readonly budgetCents: number;
  readonly slots: number;
  readonly awardCents: number;
}

export interface AwardWinner {
  readonly appId: string;
  readonly amountCents: number;
}

export interface AwardDecision {
  readonly winners: readonly AwardWinner[];
  readonly spentCents: number;
}

/** Sort by score desc, then appId asc (stable, deterministic tie-break). */
function sortRanked(
  ranked: readonly RankedApplication[],
): readonly RankedApplication[] {
  return [...ranked].sort((a, b) => {
    if (b.consensusScore !== a.consensusScore) {
      return b.consensusScore - a.consensusScore;
    }
    return a.appId < b.appId ? -1 : a.appId > b.appId ? 1 : 0;
  });
}

/** Selects winners bounded by both the euro budget and the slot count. */
export function decideAwards(input: AwardDecisionInput): AwardDecision {
  const sorted = sortRanked(input.ranked);
  const winners: AwardWinner[] = [];
  let spentCents = 0;

  for (const app of sorted) {
    if (winners.length >= input.slots) {
      break;
    }
    if (input.awardCents <= 0) {
      break;
    }
    if (spentCents + input.awardCents > input.budgetCents) {
      break;
    }
    winners.push({ appId: app.appId, amountCents: input.awardCents });
    spentCents += input.awardCents;
  }

  return { winners, spentCents };
}
