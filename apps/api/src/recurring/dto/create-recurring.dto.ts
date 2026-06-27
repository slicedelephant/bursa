import { IsInt, IsString, Min } from 'class-validator';

export class CreateRecurringDto {
  @IsString()
  campaignId!: string;

  /** Monthly contribution in EUR cents. */
  @IsInt()
  @Min(100)
  amountCents!: number;
}
