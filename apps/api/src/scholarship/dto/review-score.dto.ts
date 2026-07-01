import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** One reviewer's score (0-5) + optional comment for a single rubric field. */
export class FieldScoreDto {
  @IsString()
  @MaxLength(60)
  fieldKey!: string;

  @IsInt()
  @Min(0)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReviewScoreDto {
  @IsString()
  @MaxLength(60)
  reviewerId!: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FieldScoreDto)
  scores!: FieldScoreDto[];
}
