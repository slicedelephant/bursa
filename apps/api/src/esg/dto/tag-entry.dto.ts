import { EsgCategory } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Tags a ledger entry with an ESG category. Validated at the boundary. The tag is
 * additive — the referenced ledger entry is never mutated (append-only invariant).
 */
export class TagEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  ledgerEntryId!: string;

  @IsEnum(EsgCategory)
  category!: EsgCategory;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
