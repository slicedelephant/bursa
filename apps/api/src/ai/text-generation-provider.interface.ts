/**
 * The single seam between the AI coach and any text-generation backend.
 * The prototype ships MockTextGenerationProvider (deterministic, no network); a
 * real provider (Claude / Anthropic) must implement this same interface with
 * zero changes to the coach service. Mirrors the PaymentProvider abstraction.
 *
 * The provider only turns prompts into raw text variants. ALL brand/tone rules,
 * ranking and budgeting live in the pure cores around it, so the provider stays
 * thin and swappable.
 */

import type { BuiltPrompt } from './prompt-builder';

export interface GenerateRequest {
  /** The system + user prompt produced by the pure prompt-builder. */
  readonly prompt: BuiltPrompt;
  /** How many variants the coach asked for. */
  readonly variants: number;
  /** Optional deterministic seed so the mock is reproducible per input. */
  readonly seed?: string;
}

export interface GenerateResult {
  /** Raw variant texts (uncleaned, unranked) — one per requested variant. */
  readonly variants: readonly string[];
  /** Which concrete provider produced this (e.g. "mock" | "claude"). */
  readonly provider: string;
}

export interface TextGenerationProvider {
  /** Produce raw text variants for a built prompt. Never throws for the mock. */
  generate(request: GenerateRequest): Promise<GenerateResult>;
}

export const TEXT_GENERATION_PROVIDER = Symbol('TEXT_GENERATION_PROVIDER');
