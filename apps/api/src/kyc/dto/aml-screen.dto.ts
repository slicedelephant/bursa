import { IsInt, IsString, Length, Min } from 'class-validator';

/** AML screening request for a sponsor contribution. */
export class AmlScreenDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  /** ISO-3166 alpha-2 country code of the contribution. */
  @IsString()
  @Length(2, 2)
  country!: string;
}
