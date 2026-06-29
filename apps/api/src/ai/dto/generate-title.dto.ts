import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Boundary input for the AI title generator. */
export class GenerateTitleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  school!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  program!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  motivation!: string;

  @IsOptional()
  @IsIn(['de', 'en'])
  locale?: 'de' | 'en';
}
