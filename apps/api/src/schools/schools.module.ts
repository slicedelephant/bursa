import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createEsignatureProvider } from './e-signature.provider.factory';
import { ESIGNATURE_PROVIDER } from './e-signature.provider.interface';
import { MockRegistrarProvider } from './mock-registrar.provider';
import { REGISTRAR_PROVIDER } from './registrar.provider.interface';
import { SchoolAdmissionsService } from './school-admissions.service';
import { SchoolCampaignsService } from './school-campaigns.service';
import { SchoolOnboardingController } from './school-onboarding.controller';
import { SchoolOnboardingService } from './school-onboarding.service';
import { SchoolPortalController } from './school-portal.controller';
import { SchoolPortalService } from './school-portal.service';
import { SchoolWebhookService } from './school-webhook.service';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';

@Module({
  controllers: [
    SchoolsController,
    SchoolPortalController,
    SchoolOnboardingController,
  ],
  providers: [
    SchoolsService,
    SchoolPortalService,
    SchoolOnboardingService,
    SchoolAdmissionsService,
    SchoolCampaignsService,
    SchoolWebhookService,
    {
      // External e-signature seam (mock by default; DocuSign not implemented).
      provide: ESIGNATURE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createEsignatureProvider(
          {
            ESIGNATURE_PROVIDER: config.get<string>('ESIGNATURE_PROVIDER'),
            DOCUSIGN_API_KEY: config.get<string>('DOCUSIGN_API_KEY'),
          },
          new Logger('EsignatureProviderFactory'),
        ),
    },
    {
      // External registrar / SIS seam (deterministic mock).
      provide: REGISTRAR_PROVIDER,
      useClass: MockRegistrarProvider,
    },
  ],
  exports: [SchoolsService, SchoolWebhookService, SchoolPortalService],
})
export class SchoolsModule {}
