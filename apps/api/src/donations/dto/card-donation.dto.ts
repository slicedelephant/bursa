import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
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
}
