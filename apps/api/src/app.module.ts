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
  ],
})
export class AppModule {}
