import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Boundary input for the AI social-share text generator. */
export class GenerateShareDto {
  @IsIn(['whatsapp', 'email', 'linkedin'])
  channel!: 'whatsapp' | 'email' | 'linkedin';

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  story!: string;

  @IsOptional()
  @IsIn(['de', 'en'])
  locale?: 'de' | 'en';
}
