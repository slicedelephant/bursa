import { IsString, MinLength } from 'class-validator';

/** Shared reject payload — a non-empty reason for an admission or campaign rejection. */
export class RejectReasonDto {
  @IsString()
  @MinLength(1)
  note!: string;
}
