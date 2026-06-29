import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SavePayoutDto {
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
}
