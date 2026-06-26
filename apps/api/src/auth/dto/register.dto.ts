import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  /** ADMIN cannot be self-assigned; defaults to DONOR. */
  @IsOptional()
  @IsIn(['DONOR', 'STUDENT', 'SPONSOR'])
  role?: 'DONOR' | 'STUDENT' | 'SPONSOR';
}
