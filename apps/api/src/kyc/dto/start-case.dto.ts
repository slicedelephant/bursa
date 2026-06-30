import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Starts a verification case for the logged-in student. */
export class StartCaseDto {
  /** Optional E8 admission record to match the diploma against. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  admissionRecordId?: string;
}
