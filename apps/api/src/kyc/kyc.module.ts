import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockRegistrarProvider } from '../schools/mock-registrar.provider';
import { REGISTRAR_PROVIDER } from '../schools/registrar.provider.interface';
import { SecurityModule } from '../security/security.module';
import { createAmlProvider } from './aml-provider.factory';
import { AML_SCREENING_PROVIDER } from './aml-screening.provider.interface';
import { createIdentityProvider } from './identity-provider.factory';
import { IDENTITY_VERIFICATION_PROVIDER } from './identity-verification.provider.interface';
import { KycAmlController } from './kyc-aml.controller';
import { KycReviewController } from './kyc-review.controller';
import { KycReviewService } from './kyc-review.service';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

/**
 * E11 KYC & Verification Pipeline. Liveness, document OCR + fuzzy name match,
 * AML screening, risk scoring and a manual-review queue. The identity and AML
 * providers sit behind swappable seams (Mock by default; Persona/Sumsub env-
 * gated) chosen by the pure factories, exactly like PaymentsModule. Reuses E6
 * (AuditService via SecurityModule) and the E8 registrar seam — no duplicate
 * audit/registrar systems. Never touches the money path.
 */
@Module({
  imports: [SecurityModule],
  controllers: [KycController, KycAmlController, KycReviewController],
  providers: [
    KycService,
    KycReviewService,
    {
      provide: IDENTITY_VERIFICATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createIdentityProvider(
          {
            KYC_PROVIDER: config.get<string>('KYC_PROVIDER'),
            PERSONA_API_KEY: config.get<string>('PERSONA_API_KEY'),
          },
          new Logger('IdentityProviderFactory'),
        ),
    },
    {
      provide: AML_SCREENING_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createAmlProvider(
          {
            AML_PROVIDER: config.get<string>('AML_PROVIDER'),
            SUMSUB_API_KEY: config.get<string>('SUMSUB_API_KEY'),
          },
          new Logger('AmlProviderFactory'),
        ),
    },
    {
      // Reused E8 registrar / SIS seam (deterministic mock) for the document
      // cross-check against the school. Not a second registrar implementation.
      provide: REGISTRAR_PROVIDER,
      useClass: MockRegistrarProvider,
    },
  ],
})
export class KycModule {}
