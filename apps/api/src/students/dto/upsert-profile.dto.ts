import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertProfileDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  country!: string;

  @IsString()
  @MinLength(1)
  story!: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
