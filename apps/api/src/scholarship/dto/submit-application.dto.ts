import { IsEmail, IsObject, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * E19 — a public applicant submits their answers via the token link. Answers are
 * a flat key -> value map; typed/required/visibility validation happens in the
 * pure cores at the boundary.
 */
export class SubmitApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  applicantName!: string;

  @IsEmail()
  @MaxLength(200)
  applicantEmail!: string;

  @IsObject()
  answers!: Record<string, string>;
}
