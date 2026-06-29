import { IsString, MinLength } from 'class-validator';

export class SignAgreementDto {
  @IsString()
  @MinLength(2)
  signerName!: string;
}
