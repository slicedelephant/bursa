import { IsOptional, IsString } from 'class-validator';

export class SubmitCampaignDto {
  /** Symbolic reference to the admission document. */
  @IsOptional()
  @IsString()
  admissionRef?: string;
}
