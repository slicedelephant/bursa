import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ANALYTICS_EVENT_TYPES } from '../funnel-steps';

/**
 * Boundary validation for the public analytics ingest. `type` is whitelisted to
 * the known funnel/product events; everything else is optional, bounded and
 * PII-redacted server-side before persistence. No raw IP is ever accepted — the
 * caller supplies an anonymous `visitorId`.
 */
export class TrackEventDto {
  @IsIn(ANALYTICS_EVENT_TYPES as string[])
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  step?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
