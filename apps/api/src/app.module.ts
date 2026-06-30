import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolsModule } from './schools/schools.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DonationsModule } from './donations/donations.module';
import { StudentsModule } from './students/students.module';
import { SponsorsModule } from './sponsors/sponsors.module';
import { PayoutsModule } from './payouts/payouts.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RecurringModule } from './recurring/recurring.module';
import { DonorsModule } from './donors/donors.module';
import { CorporateModule } from './corporate/corporate.module';
import { SecurityModule } from './security/security.module';
import { ObservabilityModule } from './observability/observability.module';
import { TrustSafetyModule } from './trust-safety/trust-safety.module';
import { AiModule } from './ai/ai.module';
import { KycModule } from './kyc/kyc.module';
import { LedgerModule } from './ledger/ledger.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { MatchingModule } from './matching/matching.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PaymentsModule,
    AuthModule,
    SchoolsModule,
    CampaignsModule,
    DonationsModule,
    StudentsModule,
    SponsorsModule,
    PayoutsModule,
    AdminModule,
    NotificationsModule,
    RecurringModule,
    DonorsModule,
    CorporateModule,
    SecurityModule,
    ObservabilityModule,
    TrustSafetyModule,
    AiModule,
    KycModule,
    LedgerModule,
    ReconciliationModule,
    MatchingModule,
  ],
})
export class AppModule {}
