import { Gender } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Sets optional diversity fields on a scholar profile. All fields are optional —
 * capturing them never breaks the E8 onboarding / E11 KYC flows (no privacy shock).
 */
export class DiversityDto {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsBoolean()
  firstGen?: boolean;
}
