import { IsIn, IsOptional, IsString } from 'class-validator';

export class GalleryQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['LIVE', 'FUNDED', 'DISBURSED'])
  status?: 'LIVE' | 'FUNDED' | 'DISBURSED';
}
