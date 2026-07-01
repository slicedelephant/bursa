import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { HrisProvider } from '@prisma/client';

/** E21 — connect an HRIS to a corporate profile (scopes validated read-only). */
export class ConnectHrisDto {
  @IsString()
  @MaxLength(64)
  corporateProfileId!: string;

  @IsEnum(HrisProvider)
  provider!: HrisProvider;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  scopes!: string[];

  @IsString()
  @MaxLength(160)
  programName!: string;
}

/** E21 — sync employees from a connected HRIS (mock provider). */
export class SyncHrisDto {
  @IsString()
  @MaxLength(64)
  connectionId!: string;
}

/** E21 — configure the firm-wide match rule for a program. */
export class ConfigureRuleDto {
  @IsString()
  @MaxLength(64)
  programId!: string;

  @IsInt()
  @Min(0)
  matchRatio!: number;

  @IsInt()
  @Min(0)
  perEmployeeCapCents!: number;
}

/** E21 — employee-side payroll-giving opt-in. */
export class ActivateEmployeeDto {
  @IsString()
  @MaxLength(64)
  employeeProfileId!: string;
}

/** E21 — run a payroll-giving campaign ("match month"); money goes to the school. */
export class RunCampaignDto {
  @IsString()
  @MaxLength(64)
  programId!: string;

  @IsString()
  @MaxLength(64)
  campaignId!: string;

  @IsInt()
  @Min(1)
  defaultContributionCents!: number;

  @IsOptional()
  @IsBoolean()
  preTax?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxRatePercent?: number;
}

/** E21 — HRIS sync-status webhook body (signature checked by the guard). */
export class HrisWebhookDto {
  @IsString()
  @MaxLength(64)
  connectionId!: string;

  @IsEnum({ SYNCED: 'SYNCED', ERROR: 'ERROR' })
  status!: 'SYNCED' | 'ERROR';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
