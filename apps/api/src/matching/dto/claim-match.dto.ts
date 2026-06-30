import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

const LOCALES = ['en', 'de', 'fr', 'es'] as const;

export class ClaimMatchDto {
  /** The triggering donation to claim a match against (idempotent per donation). */
  @IsString()
  donationId!: string;

  /** Work email; optional when a logged-in donor already has a detected employer. */
  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: (typeof LOCALES)[number];
}
