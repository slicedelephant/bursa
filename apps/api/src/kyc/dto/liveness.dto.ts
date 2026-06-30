import { IsString, MaxLength, MinLength } from 'class-validator';

/** Submits the liveness (video-selfie) step. A token ending in `-FAIL` fails. */
export class LivenessDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  livenessToken!: string;
}
