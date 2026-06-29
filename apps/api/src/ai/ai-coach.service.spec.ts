import { AiCoachService } from './ai-coach.service';
import { MockTextGenerationProvider } from './mock-text-generation.provider';
import { DEFAULT_TOKEN_LIMIT } from './token-budget';
import type { TextGenerationProvider } from './text-generation-provider.interface';

function buildPrisma(budget: Record<string, unknown> | null) {
  let current = budget;
  const aiTokenBudget = {
    findUnique: jest.fn().mockImplementation(() => Promise.resolve(current)),
    create: jest.fn().mockImplementation(({ data }) => {
      current = { ...data };
      return Promise.resolve(current);
    }),
    update: jest.fn().mockImplementation(({ data }) => {
      current = { ...current, ...data };
      return Promise.resolve(current);
    }),
  };
  const aiGeneration = { create: jest.fn().mockResolvedValue({ id: 'g1' }) };
  return { aiTokenBudget, aiGeneration };
}

function makeService(
  prisma: ReturnType<typeof buildPrisma>,
  provider: TextGenerationProvider = new MockTextGenerationProvider(),
) {
  return new AiCoachService(prisma as never, provider);
}

const titleDto = {
  country: 'Nigeria',
  school: 'ESMT Berlin',
  program: 'Full-Time MBA',
  motivation: 'bring fintech back to West Africa',
  locale: 'en' as const,
};

describe('AiCoachService', () => {
  describe('getBudget', () => {
    it('lazily creates a default budget on first read', async () => {
      const prisma = buildPrisma(null);
      const service = makeService(prisma);
      const view = await service.getBudget('u1');
      expect(prisma.aiTokenBudget.create).toHaveBeenCalled();
      expect(view.limitTokens).toBe(DEFAULT_TOKEN_LIMIT);
      expect(view.remainingTokens).toBe(DEFAULT_TOKEN_LIMIT);
      expect(view.exhausted).toBe(false);
    });

    it('returns an existing budget without creating one', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: 1000,
        usedTokens: 300,
        generations: 2,
      });
      const service = makeService(prisma);
      const view = await service.getBudget('u1');
      expect(prisma.aiTokenBudget.create).not.toHaveBeenCalled();
      expect(view.remainingTokens).toBe(700);
    });
  });

  describe('generateTitle', () => {
    it('returns ranked variants and charges the budget', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      const service = makeService(prisma);
      const out = await service.generateTitle('u1', titleDto);
      expect(out.kind).toBe('TITLE');
      expect(out.variants.length).toBeGreaterThan(0);
      expect(out.recommendedIndex).toBeGreaterThanOrEqual(0);
      expect(prisma.aiTokenBudget.update).toHaveBeenCalled();
      expect(prisma.aiGeneration.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ kind: 'TITLE' }) }),
      );
      expect(out.budget.remainingTokens).toBeLessThan(DEFAULT_TOKEN_LIMIT);
    });

    it('refuses with BUDGET_EXCEEDED and never calls the provider', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: 100,
        usedTokens: 100,
        generations: 5,
      });
      const provider = { generate: jest.fn() };
      const service = makeService(prisma, provider as never);
      await expect(service.generateTitle('u1', titleDto)).rejects.toMatchObject({
        status: 429,
      });
      expect(provider.generate).not.toHaveBeenCalled();
      expect(prisma.aiGeneration.create).not.toHaveBeenCalled();
    });

    it('defaults the locale to en when omitted', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      const service = makeService(prisma);
      const { locale, ...noLocale } = titleDto;
      void locale;
      const out = await service.generateTitle('u1', noLocale as never);
      expect(out.locale).toBe('en');
    });

    it('enforces real umlauts for the German locale', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      const service = makeService(prisma);
      const out = await service.generateTitle('u1', { ...titleDto, locale: 'de' });
      expect(out.locale).toBe('de');
      expect(out.variants.map((v) => v.text).join(' ')).toMatch(/[äöüß]/);
    });
  });

  describe('generateStory', () => {
    it('splits the draft into the three E3 story parts', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      const service = makeService(prisma);
      const out = await service.generateStory('u1', {
        school: 'ESMT Berlin',
        goalEur: 42000,
        motivation: 'scale a payments team',
        locale: 'en',
      });
      expect(out.kind).toBe('STORY');
      expect(out.variants[0].parts.background.length).toBeGreaterThan(0);
      expect(out.variants[0].parts.challenge.length).toBeGreaterThan(0);
      expect(out.variants[0].parts.vision.length).toBeGreaterThan(0);
    });

    it('weaves in background notes and defaults locale to en', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      const service = makeService(prisma);
      const out = await service.generateStory('u1', {
        school: 'ESMT Berlin',
        goalEur: 42000,
        motivation: 'scale a payments team',
        background: 'I led a 200k-user product',
      } as never);
      expect(out.locale).toBe('en');
      expect(out.variants.length).toBeGreaterThan(0);
    });

    it('maps a single-paragraph draft onto background with empty challenge/vision', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      // A provider that returns one long single-paragraph variant.
      const provider = {
        generate: jest.fn().mockResolvedValue({
          provider: 'mock',
          variants: ['A single paragraph story without blank-line breaks. '.repeat(8)],
        }),
      };
      const service = makeService(prisma, provider as never);
      const out = await service.generateStory('u1', {
        school: 'ESMT Berlin',
        goalEur: 42000,
        motivation: 'm',
        locale: 'en',
      });
      expect(out.variants[0].parts.background.length).toBeGreaterThan(0);
      expect(out.variants[0].parts.challenge).toBe('');
      expect(out.variants[0].parts.vision).toBe('');
    });
  });

  describe('generateShare', () => {
    it('returns channel-tailored share variants', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      const service = makeService(prisma);
      const out = await service.generateShare('u1', {
        channel: 'whatsapp',
        title: 'From Lagos to Berlin',
        story: 'A short story about my MBA journey.',
        locale: 'en',
      });
      expect(out.kind).toBe('SHARE');
      expect(out.channel).toBe('whatsapp');
      expect(out.variants.length).toBeGreaterThan(0);
      expect(prisma.aiGeneration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ kind: 'SHARE', channel: 'whatsapp' }),
        }),
      );
    });

    it('defaults the locale to en when omitted', async () => {
      const prisma = buildPrisma({
        userId: 'u1',
        limitTokens: DEFAULT_TOKEN_LIMIT,
        usedTokens: 0,
        generations: 0,
      });
      const service = makeService(prisma);
      const out = await service.generateShare('u1', {
        channel: 'linkedin',
        title: 'My MBA',
        story: 'A short story.',
      } as never);
      expect(out.locale).toBe('en');
    });
  });
});
