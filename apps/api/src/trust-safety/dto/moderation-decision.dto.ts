import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ModerationDecisionDto {
  @IsIn(['APPROVE', 'REJECT', 'ESCALATE'])
  action!: 'APPROVE' | 'REJECT' | 'ESCALATE';

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note!: string;
}
