import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsEmbeddableVideoUrl } from './is-video-url.validator';

export class CreateCampaignDto {
  @IsString()
  schoolId!: string;

  @IsString()
  @MinLength(3)
  programName!: string;

  @IsString()
  @MinLength(5)
  title!: string;

  /** Canonical display story (the wizard composes it from the guided prompts). */
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

  /** Optional pitch video as an embeddable YouTube/Vimeo link (no upload). */
  @IsOptional()
  @IsEmbeddableVideoUrl()
  videoUrl?: string;

  /** Guided story building blocks (Vorher/Nachher), persisted for re-editing. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  storyBackground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  storyChallenge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  storyVision?: string;
}
