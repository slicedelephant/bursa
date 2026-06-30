import { IsBoolean } from 'class-validator';

/** Toggle participation in the anonymous referral leaderboard (E15). */
export class LeaderboardOptInDto {
  @IsBoolean()
  optIn!: boolean;
}
