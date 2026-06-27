import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../security/is-strong-password.validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  /** ADMIN cannot be self-assigned; defaults to DONOR. */
  @IsOptional()
  @IsIn(['DONOR', 'STUDENT', 'SPONSOR'])
  role?: 'DONOR' | 'STUDENT' | 'SPONSOR';
}
