import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiCoachService } from './ai-coach.service';
import { createTextGenerationProvider } from './text-generation-provider.factory';
import { TEXT_GENERATION_PROVIDER } from './text-generation-provider.interface';

/**
 * AI coach module. Global so the provider can be injected anywhere via
 * `@Inject(TEXT_GENERATION_PROVIDER)`. The concrete provider is chosen at runtime
 * by the factory: Mock by default (no key, no network), Claude when
 * AI_PROVIDER=claude and an ANTHROPIC_API_KEY is present. Mirrors PaymentsModule.
 */
@Global()
@Module({
  controllers: [AiController],
  providers: [
    AiCoachService,
    {
      provide: TEXT_GENERATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createTextGenerationProvider(
          {
            AI_PROVIDER: config.get<string>('AI_PROVIDER'),
            ANTHROPIC_API_KEY: config.get<string>('ANTHROPIC_API_KEY'),
            ANTHROPIC_MODEL: config.get<string>('ANTHROPIC_MODEL'),
          },
          new Logger('TextGenerationProviderFactory'),
        ),
    },
  ],
  exports: [TEXT_GENERATION_PROVIDER, AiCoachService],
})
export class AiModule {}
