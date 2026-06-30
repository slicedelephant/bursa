import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Invite one advocate (alumnus/friend) to promote a campaign (E15). */
export class InviteAdvocateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
