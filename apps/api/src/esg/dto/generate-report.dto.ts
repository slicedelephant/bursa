import { ReportStandard } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Generates (and optionally persists) an ESG report for a standard and year. The
 * mapping is illustrative, not a certified disclosure schema.
 */
export class GenerateReportDto {
  @IsEnum(ReportStandard)
  standard!: ReportStandard;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
