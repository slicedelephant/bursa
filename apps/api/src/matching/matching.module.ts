import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createEmployerMatchProvider } from './employer-match-provider.factory';
import { EMPLOYER_MATCH_PROVIDER } from './employer-match.provider.interface';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

/**
 * E13 Employer-Matching. The employer-match provider is chosen at runtime by the
 * factory: Mock by default, Double the Donation when EMPLOYER_MATCH_PROVIDER=dtd
 * and a DTD_API_KEY is present. Mirrors PaymentsModule.
 */
@Module({
  controllers: [MatchingController],
  providers: [
    MatchingService,
    {
      provide: EMPLOYER_MATCH_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createEmployerMatchProvider(
          {
            EMPLOYER_MATCH_PROVIDER: config.get<string>(
              'EMPLOYER_MATCH_PROVIDER',
            ),
            DTD_API_KEY: config.get<string>('DTD_API_KEY'),
          },
          new Logger('EmployerMatchProviderFactory'),
        ),
    },
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
