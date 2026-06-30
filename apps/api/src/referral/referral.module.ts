import { Module } from '@nestjs/common';
import {
  AdvocateController,
  DonorReferralController,
  ReferralLeaderboardController,
} from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  controllers: [
    DonorReferralController,
    ReferralLeaderboardController,
    AdvocateController,
  ],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
