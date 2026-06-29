import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GenerateOnboardingLinkDto {
  /** Token lifetime in hours (default 168 = 7 days). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}
