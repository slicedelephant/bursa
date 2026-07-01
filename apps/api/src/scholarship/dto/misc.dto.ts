import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { MessagingChannel } from '../../impact-feed/messaging/messaging-provider.interface';

/** Invite a reviewer (max 10 enforced in the service). */
export class AddReviewerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  reviewerName!: string;

  @IsEmail()
  @MaxLength(200)
  reviewerEmail!: string;
}

/** Decide winners for a given cycle year (budget/slots come from the cycle). */
export class DecideAwardsDto {
  @IsInt()
  @Min(2000)
  cycleYear!: number;
}

/** Release the conditional second tranche when the GPA meets the threshold. */
export class ReleaseTrancheDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  gpa!: number;
}

const SCHOLAR_EVENTS = ['enroll', 'graduate', 'employ', 'withdraw'] as const;
export type ScholarEventDtoValue = (typeof SCHOLAR_EVENTS)[number];

/** Advance a scholar's SRM status. */
export class ScholarStatusDto {
  @IsIn(SCHOLAR_EVENTS)
  event!: ScholarEventDtoValue;
}

const MESSAGING_CHANNELS = ['WHATSAPP', 'TELEGRAM', 'MESSENGER', 'PUSH'] as const;

/** Message a scholar via the reused E17 messaging seam (mock in the prototype). */
export class MessageScholarDto {
  @IsIn(MESSAGING_CHANNELS)
  channel!: MessagingChannel;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

/** Renew a program into the next cycle year (overrides default to last year). */
export class RenewProgramDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awardCents?: number;
}
