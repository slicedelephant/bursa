import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class FlagDecisionDto {
  @IsIn(['REVIEW', 'DISMISS'])
  action!: 'REVIEW' | 'DISMISS';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
