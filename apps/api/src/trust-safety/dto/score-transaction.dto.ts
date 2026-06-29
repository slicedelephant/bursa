import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Optional enrichment for a transaction fraud-score recompute. The Donation row
 * carries no card-type, so an operator may pass it explicitly (e.g. PREPAID).
 */
export class ScoreTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cardType?: string;
}
