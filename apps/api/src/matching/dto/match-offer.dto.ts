import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const LOCALES = ['en', 'de', 'fr', 'es'] as const;

export class MatchOfferDto {
  @IsString()
  campaignId!: string;

  /** The donor's own gift in cents, used to size the match. */
  @IsInt()
  @Min(100)
  donationCents!: number;

  /** Work email; optional when a logged-in donor already has a detected employer. */
  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: (typeof LOCALES)[number];
}
