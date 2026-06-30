/**
 * Pure peer-comparison calculator — a generic gamification primitive. Compares one
 * value against the average of a population of values, returning a motivational
 * (never shaming) numeric comparison. No identities, no PII — only aggregates.
 * No I/O; returns new values; never mutates inputs. The donor portfolio (E16)
 * compares "students supported"; E15/E18 can compare any per-actor metric.
 */

export interface PeerComparison {
  readonly yourValue: number;
  /** Population average, rounded to one decimal. */
  readonly peerAverage: number;
  /** yourValue / peerAverage, rounded to two decimals (0 when the average is 0). */
  readonly ratio: number;
  /** True when you meet or beat the average (kept inclusive to stay encouraging). */
  readonly ahead: boolean;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function comparePeers(
  yourValue: number,
  populationValues: ReadonlyArray<number>,
): PeerComparison {
  const rawAverage =
    populationValues.length === 0
      ? 0
      : populationValues.reduce((sum, value) => sum + value, 0) /
        populationValues.length;
  const peerAverage = round(rawAverage, 1);

  return {
    yourValue,
    peerAverage,
    ratio: rawAverage === 0 ? 0 : round(yourValue / rawAverage, 2),
    ahead: yourValue >= rawAverage,
  };
}
