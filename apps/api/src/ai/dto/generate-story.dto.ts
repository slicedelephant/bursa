import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Boundary input for the AI story-draft generator. */
export class GenerateStoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  school!: string;

  @IsInt()
  @Min(1)
  goalEur!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  motivation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  background?: string;

  @IsOptional()
  @IsIn(['de', 'en'])
  locale?: 'de' | 'en';
}
