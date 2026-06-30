import { Inject, Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  LENGTH_TARGETS,
  Locale,
  ShareChannel,
  buildSharePrompt,
  buildStoryPrompt,
  buildTitlePrompt,
} from './prompt-builder';
import {
  BudgetState,
  DEFAULT_TOKEN_LIMIT,
  applyUsage,
  estimateTokens,
  isExhausted,
  toBudgetView,
} from './token-budget';
import { applyTone } from './tone-postprocessor';
import { rankVariants } from './variant-ranking';
import {
  TEXT_GENERATION_PROVIDER,
  type TextGenerationProvider,
} from './text-generation-provider.interface';
import { GenerateTitleDto } from './dto/generate-title.dto';
import { GenerateStoryDto } from './dto/generate-story.dto';
import { GenerateShareDto } from './dto/generate-share.dto';

type GenKind = 'TITLE' | 'STORY' | 'SHARE';

export interface StoryParts {
  background: string;
  challenge: string;
  vision: string;
}

/**
 * Thin orchestration around the pure cores + the swappable provider:
 * guard budget → build prompt (pure) → call provider → tone-process + rank
 * (pure) → charge budget → record generation. The provider is the only seam
 * that could touch a network, and the default is the deterministic Mock.
 */
@Injectable()
export class AiCoachService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly provider: TextGenerationProvider,
  ) {}

  /** Read (or lazily create) the user's token budget as a client view. */
  async getBudget(userId: string) {
    const state = await this.loadBudget(userId);
    return toBudgetView(state);
  }

  async generateTitle(userId: string, dto: GenerateTitleDto) {
    const locale: Locale = dto.locale ?? 'en';
    const state = await this.guardBudget(userId);
    const prompt = buildTitlePrompt({
      country: dto.country,
      school: dto.school,
      program: dto.program,
      motivation: dto.motivation,
      locale,
    });
    const inputChars =
      dto.country.length +
      dto.school.length +
      dto.program.length +
      dto.motivation.length;
    const raw = await this.provider.generate({
      prompt,
      variants: 3,
      seed: inputChars + dto.motivation,
    });
    const ranked = this.process(raw.variants, LENGTH_TARGETS.title, locale);
    const budget = await this.charge(
      userId,
      state,
      inputChars,
      ranked.outputChars,
      'TITLE',
      locale,
      raw.provider,
      ranked.variants.length,
      null,
    );
    return {
      kind: 'TITLE' as GenKind,
      locale,
      provider: raw.provider,
      variants: ranked.variants,
      recommendedIndex: ranked.recommendedIndex,
      budget,
    };
  }

  async generateStory(userId: string, dto: GenerateStoryDto) {
    const locale: Locale = dto.locale ?? 'en';
    const state = await this.guardBudget(userId);
    const prompt = buildStoryPrompt({
      school: dto.school,
      goalEur: dto.goalEur,
      motivation: dto.motivation,
      background: dto.background,
      locale,
    });
    const inputChars =
      dto.school.length + dto.motivation.length + (dto.background?.length ?? 0);
    const raw = await this.provider.generate({
      prompt,
      variants: 2,
      seed: inputChars + dto.motivation,
    });
    const ranked = this.process(raw.variants, LENGTH_TARGETS.story, locale);
    const variants = ranked.variants.map((v) => ({
      ...v,
      parts: this.splitStory(v.text),
    }));
    const budget = await this.charge(
      userId,
      state,
      inputChars,
      ranked.outputChars,
      'STORY',
      locale,
      raw.provider,
      variants.length,
      null,
    );
    return {
      kind: 'STORY' as GenKind,
      locale,
      provider: raw.provider,
      variants,
      recommendedIndex: ranked.recommendedIndex,
      budget,
    };
  }

  async generateShare(userId: string, dto: GenerateShareDto) {
    const locale: Locale = dto.locale ?? 'en';
    const channel: ShareChannel = dto.channel;
    const state = await this.guardBudget(userId);
    const prompt = buildSharePrompt({
      channel,
      title: dto.title,
      story: dto.story,
      locale,
    });
    const inputChars = dto.title.length + dto.story.length;
    const raw = await this.provider.generate({
      prompt,
      variants: 3,
      seed: inputChars + channel,
    });
    const ranked = this.process(
      raw.variants,
      LENGTH_TARGETS.share[channel],
      locale,
    );
    const budget = await this.charge(
      userId,
      state,
      inputChars,
      ranked.outputChars,
      'SHARE',
      locale,
      raw.provider,
      ranked.variants.length,
      channel,
    );
    return {
      kind: 'SHARE' as GenKind,
      channel,
      locale,
      provider: raw.provider,
      variants: ranked.variants,
      recommendedIndex: ranked.recommendedIndex,
      budget,
    };
  }

  // --- internals -----------------------------------------------------------

  private async loadBudget(userId: string): Promise<BudgetState> {
    const existing = await this.prisma.aiTokenBudget.findUnique({
      where: { userId },
    });
    if (existing) {
      return {
        limitTokens: existing.limitTokens,
        usedTokens: existing.usedTokens,
        generations: existing.generations,
      };
    }
    const created = await this.prisma.aiTokenBudget.create({
      data: {
        userId,
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      },
    });
    return {
      limitTokens: created.limitTokens,
      usedTokens: created.usedTokens,
      generations: created.generations,
    };
  }

  /** Load the budget and refuse (429) before any provider call if exhausted. */
  private async guardBudget(userId: string): Promise<BudgetState> {
    const state = await this.loadBudget(userId);
    if (isExhausted(state)) {
      throw new DomainException(
        'BUDGET_EXCEEDED',
        'AI token budget exhausted for this user.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return state;
  }

  /** Tone-process + rank raw variants; report combined output length. */
  private process(
    raw: readonly string[],
    window: { min: number; max: number },
    locale: Locale,
  ) {
    const toned = raw.map((text) => applyTone(text, locale));
    const ranked = rankVariants(toned, window);
    const outputChars = ranked.variants.reduce((sum, v) => sum + v.length, 0);
    return {
      variants: ranked.variants,
      recommendedIndex: ranked.recommendedIndex,
      outputChars,
    };
  }

  /** Map a multi-paragraph draft onto the three E3 story parts. */
  private splitStory(text: string): StoryParts {
    const paras = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return {
      background: paras[0] ?? text.trim(),
      challenge: paras[1] ?? '',
      vision: paras[2] ?? '',
    };
  }

  /** Charge the budget, persist usage + a generation record, return the view. */
  private async charge(
    userId: string,
    state: BudgetState,
    inputChars: number,
    outputChars: number,
    kind: GenKind,
    locale: Locale,
    provider: string,
    variantCount: number,
    channel: string | null,
  ) {
    const tokensCharged = estimateTokens(inputChars, outputChars);
    const next = applyUsage(state, tokensCharged);
    await this.prisma.aiTokenBudget.update({
      where: { userId },
      data: { usedTokens: next.usedTokens, generations: next.generations },
    });
    await this.prisma.aiGeneration.create({
      data: {
        userId,
        kind,
        channel,
        locale,
        provider,
        tokensCharged,
        variantCount,
      },
    });
    const view = toBudgetView(next);
    return { remainingTokens: view.remainingTokens, exhausted: view.exhausted };
  }
}
