import { IsEmail, IsIn, IsOptional } from 'class-validator';

const LOCALES = ['en', 'de', 'fr', 'es'] as const;

export class DetectMatchDto {
  /** Work email whose domain is checked against the employer-match DB. */
  @IsEmail()
  workEmail!: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: (typeof LOCALES)[number];
}
