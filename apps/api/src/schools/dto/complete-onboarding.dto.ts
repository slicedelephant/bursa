import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** Hosted onboarding flow: payout data + signature captured in one step (E8). */
export class CompleteOnboardingDto {
  @IsString()
  @MinLength(2)
  bankAccountName!: string;

  @IsString()
  @MinLength(5)
  iban!: string;

  @IsOptional()
  @IsString()
  bic?: string;

  @IsString()
  @MinLength(2)
  taxId!: string;

  @IsString()
  @MinLength(2)
  contactName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsString()
  @MinLength(2)
  signerName!: string;
}
