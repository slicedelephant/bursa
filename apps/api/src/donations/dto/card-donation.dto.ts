import { TributeType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CardDonationDto {
  /** Donation amount in EUR cents (counts toward the goal). */
  @IsInt()
  @Min(100)
  amountCents!: number;

  /** Optional tip supporting the platform (does not count toward the goal). */
  @IsOptional()
  @IsInt()
  @Min(0)
  tipCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  donorName?: string;

  @IsOptional()
  @IsEmail()
  donorEmail?: string;

  /**
   * Tribute / dedication. Type and name belong together: setting one without the
   * other is rejected at the boundary (cross-`@ValidateIf`).
   */
  @ValidateIf((o) => o.tributeName !== undefined && o.tributeName !== null)
  @IsEnum(TributeType)
  tributeType?: TributeType;

  @ValidateIf((o) => o.tributeType !== undefined && o.tributeType !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tributeName?: string;
}
