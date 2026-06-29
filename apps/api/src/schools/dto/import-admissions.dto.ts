import { IsString, MinLength } from 'class-validator';

export class ImportAdmissionsDto {
  /** Raw CSV with header `email,name,program,admissionRef` (order/case flexible). */
  @IsString()
  @MinLength(1)
  csv!: string;
}
