import {
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * E19 — create a scholarship program with branding + an initial cycle. Slug is
 * lowercase-kebab, globally unique (enforced in the service against the DB).
 */
export class CreateProgramDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case',
  })
  @MaxLength(80)
  slug!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  brandPrimary?: string;

  @IsOptional()
  @IsHexColor()
  brandSecondary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsInt()
  @Min(2000)
  year!: number;

  @IsInt()
  @Min(0)
  budgetCents!: number;

  @IsInt()
  @Min(0)
  slots!: number;

  @IsInt()
  @Min(0)
  awardCents!: number;
}
