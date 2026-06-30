import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** Operator decision on a manual-review case. */
export class ReviewDecideDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note!: string;
}
