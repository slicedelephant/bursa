import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VerifyPayoutDto {
  @IsBoolean()
  payoutVerified!: boolean;

  @IsOptional()
  @IsString()
  payoutAccountRef?: string;
}
