import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertCompanyDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
