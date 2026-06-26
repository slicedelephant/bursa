import { IsOptional, IsString } from 'class-validator';

export class VerifyDto {
  @IsOptional()
  @IsString()
  admissionRef?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
