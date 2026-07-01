import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Currency, LocalPaymentMethod } from '@prisma/client';

/** E20 — initiate a local donor deposit (money still flows to the school). */
export class InitiateDepositDto {
  @IsString()
  @MaxLength(64)
  campaignId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsEnum(Currency)
  depositCurrency!: Currency;

  @IsEnum(LocalPaymentMethod)
  method!: LocalPaymentMethod;

  @IsString()
  @Length(2, 2)
  country!: string;

  @IsEnum(Currency)
  payoutCurrency!: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  payerRef?: string;
}

/** E20 — create a school's local payout account (the payout target). */
export class CreateSchoolAccountDto {
  @IsString()
  @MaxLength(64)
  schoolId!: string;

  @IsString()
  @Length(2, 2)
  country!: string;

  @IsEnum(Currency)
  currency!: Currency;

  @IsString()
  @MaxLength(160)
  bankName!: string;

  @IsString()
  @MaxLength(64)
  accountNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9 ]+$/, {
    message: 'virtualIban must be alphanumeric',
  })
  virtualIban?: string;
}

/** E20 — pay a school in a local currency (never a student). */
export class CreatePayoutDto {
  @IsString()
  @MaxLength(64)
  schoolId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsEnum(Currency)
  payoutCurrency!: Currency;

  @IsString()
  @Length(2, 2)
  payoutCountry!: string;

  @IsString()
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  refId?: string;
}

/** E20 — local payment status webhook body (signature checked by the guard). */
export class LocalPaymentWebhookDto {
  @IsString()
  @MaxLength(120)
  depositRef!: string;

  @IsEnum({ SUCCEEDED: 'SUCCEEDED', FAILED: 'FAILED' })
  status!: 'SUCCEEDED' | 'FAILED';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerRef?: string;
}
