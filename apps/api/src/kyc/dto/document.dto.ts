import { IsString, MaxLength, MinLength } from 'class-validator';

/** Submits the document/OCR step. A token ending in `-MISMATCH` mismatches. */
export class DocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  documentToken!: string;

  /** The name the student claims is on the diploma. */
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  claimedName!: string;
}
