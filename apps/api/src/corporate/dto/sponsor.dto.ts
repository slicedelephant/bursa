import { DonationMethod, SponsorshipTier } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Corporate sponsorship request. Validated at the boundary (whitelist + types).
 * A named tier (SEMESTER/YEAR/FULL) resolves its amount server-side; CUSTOM
 * requires an explicit `amountCents`.
 */
export class SponsorDto {
  @IsEnum(SponsorshipTier)
  tier!: SponsorshipTier;

  /** Required for CUSTOM; ignored for the preset tiers (amount derived). */
  @ValidateIf((o) => o.tier === 'CUSTOM')
  @IsInt()
  @Min(1000)
  amountCents?: number;

  @IsEnum(DonationMethod)
  method!: DonationMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scholarshipName?: string;

  @IsOptional()
  @IsBoolean()
  logoRecognition?: boolean;

  @IsOptional()
  @IsBoolean()
  impactReportOptIn?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  poNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  vatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;
}
