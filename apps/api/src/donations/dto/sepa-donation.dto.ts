import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SepaDonationDto {
  /** Corporate pledge amount in EUR cents. */
  @IsInt()
  @Min(1000)
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;
}
