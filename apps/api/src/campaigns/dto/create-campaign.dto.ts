import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  schoolId!: string;

  @IsString()
  @MinLength(3)
  programName!: string;

  @IsString()
  @MinLength(5)
  title!: string;

  @IsString()
  @MinLength(20)
  story!: string;

  /** Tuition goal in EUR cents. */
  @IsInt()
  @Min(1000)
  goalCents!: number;

  @IsOptional()
  @IsISO8601()
  deadline?: string;
}
