import { IsOptional, IsString } from 'class-validator';

export class ApproveCampaignDto {
  @IsOptional()
  @IsString()
  admissionRef?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
