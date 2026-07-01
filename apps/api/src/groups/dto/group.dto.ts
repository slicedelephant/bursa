import {
  DonationMethod,
  GroupMode,
  GroupRole,
  GroupVisibility,
} from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Create a group (cohort team or giving circle). Validated at the boundary. */
export class CreateGroupDto {
  @IsEnum(GroupMode)
  mode!: GroupMode;

  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sharedGoalCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  stretchThresholdPct?: number;
}

/** Create an invite link for a group (ADMIN only). */
export class CreateInviteDto {
  @IsOptional()
  @IsEnum(GroupRole)
  role?: GroupRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}

/** Join a group via an invite token. */
export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

/** Change a member's role (ADMIN only). */
export class SetRoleDto {
  @IsEnum(GroupRole)
  role!: GroupRole;
}

/** Link a sub-campaign to a cohort (owner-scoped). */
export class AddCampaignDto {
  @IsString()
  @IsNotEmpty()
  campaignId!: string;
}

/** Mirror an existing donation into a giving-circle (money-free). */
export class ContributeDto {
  @IsString()
  @IsNotEmpty()
  donationId!: string;
}

class VoteOptionInput {
  @IsString()
  @IsNotEmpty()
  campaignId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;
}

/** Open a vote (ADMIN only). */
export class OpenVoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => VoteOptionInput)
  options!: VoteOptionInput[];
}

/** Cast a ballot (CONTRIBUTOR+). */
export class CastBallotDto {
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}

/** Post a moderated chat message (CONTRIBUTOR+). */
export class PostMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;
}

/** Match a whole cohort via the existing E5 corporate flow (ADMIN + sponsor). */
export class CohortMatchDto {
  @IsInt()
  @Min(1000)
  totalCents!: number;

  @IsEnum(DonationMethod)
  method!: DonationMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scholarshipName?: string;
}
