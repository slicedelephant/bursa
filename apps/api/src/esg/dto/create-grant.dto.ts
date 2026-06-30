import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Creates a time-limited, read-only auditor access grant. The raw token is returned
 * exactly once; only its SHA-256 hash is persisted (E8 one-time-token pattern).
 */
export class CreateGrantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  /** Time-to-live in hours; clamped server-side into [1, 168]. Default 48. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  ttlHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scope?: string;
}
