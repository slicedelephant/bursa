import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * A short student thank-you message (E17). Video/voice are URLs only — there is
 * no upload pipeline. Final approve/reject is decided by `moderateVoice`; these
 * are just the boundary-shape checks.
 */
export class StudentVoiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  text!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  videoUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  voiceUrl?: string;
}
