import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const FIELD_TYPES = [
  'TEXT',
  'LONG_TEXT',
  'NUMBER',
  'SELECT',
  'BOOLEAN',
  'EMAIL',
] as const;
export type FieldTypeDtoValue = (typeof FIELD_TYPES)[number];

/** One configurable form field (schema-driven builder, not a WYSIWYG editor). */
export class FormFieldDto {
  @IsString()
  @MaxLength(60)
  fieldKey!: string;

  @IsString()
  @MaxLength(200)
  label!: string;

  @IsIn(FIELD_TYPES)
  type!: FieldTypeDtoValue;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  rubricWeight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  showIfFieldId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  showIfValue?: string;
}

export class FormSchemaDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intro?: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields!: FormFieldDto[];
}
