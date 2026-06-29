/**
 * Pure per-user AI token-budget accounting. No I/O, no mutation, no imports.
 *
 * The prototype tracks an estimated token spend per user so nobody can trigger
 * unbounded generations. This is a deterministic counter (input + output length
 * → estimated tokens), NOT a real tokenizer or billing system (see Out of Scope).
 */

/** Rough chars-per-token estimate (good enough for a budget counter). */
export const CHARS_PER_TOKEN = 4;

/** Floor charged per generation so a tiny prompt still costs something. */
export const MIN_TOKENS_PER_GENERATION = 50;

/** Default per-user allowance handed out on first use / at seed time. */
export const DEFAULT_TOKEN_LIMIT = 20_000;

export interface BudgetState {
  readonly limitTokens: number;
  readonly usedTokens: number;
  readonly generations: number;
}

export interface BudgetView {
  readonly limitTokens: number;
  readonly usedTokens: number;
  readonly remainingTokens: number;
  readonly generations: number;
  readonly exhausted: boolean;
}

/**
 * Estimate the tokens a generation costs from the combined input + output text
 * length. Always at least MIN_TOKENS_PER_GENERATION. Non-finite/negative input
 * is treated as 0 characters.
 */
export function estimateTokens(inputChars: number, outputChars: number): number {
  const safe = (n: number): number =>
    Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  const total = safe(inputChars) + safe(outputChars);
  const estimated = Math.ceil(total / CHARS_PER_TOKEN);
  return Math.max(MIN_TOKENS_PER_GENERATION, estimated);
}

/** Remaining tokens, clamped at 0 (never negative). */
export function remaining(state: BudgetState): number {
  return Math.max(0, state.limitTokens - state.usedTokens);
}

/** True once the budget cannot cover even a minimal generation. */
export function isExhausted(state: BudgetState): boolean {
  return remaining(state) < MIN_TOKENS_PER_GENERATION;
}

/**
 * Apply a charge to the budget, returning a NEW state (immutable). usedTokens is
 * capped at the limit so it never reports more spent than the allowance.
 */
export function applyUsage(state: BudgetState, tokens: number): BudgetState {
  const charge = Math.max(0, Math.floor(Number.isFinite(tokens) ? tokens : 0));
  return {
    limitTokens: state.limitTokens,
    usedTokens: Math.min(state.limitTokens, state.usedTokens + charge),
    generations: state.generations + 1,
  };
}

/** Build the client-facing view of a budget state. */
export function toBudgetView(state: BudgetState): BudgetView {
  return {
    limitTokens: state.limitTokens,
    usedTokens: state.usedTokens,
    remainingTokens: remaining(state),
    generations: state.generations,
    exhausted: isExhausted(state),
  };
}
