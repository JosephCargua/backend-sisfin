import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentPersonType } from '../enums/document-person-type.enum';
import { DocumentCategory } from '../enums/document-category.enum';
import { DocumentEntryType } from '../enums/document-entry-type.enum';
import { FinancialDocumentLineDto } from './financial-document-line.dto';

export class CreateFinancialDocumentDto {
  @IsDateString()
  issueDate: string;

  @IsEnum(DocumentPersonType)
  personType: DocumentPersonType;

  @IsEnum(DocumentCategory)
  documentCategory: DocumentCategory;

  @IsEnum(DocumentEntryType)
  entryType: DocumentEntryType;

  @IsString()
  @MaxLength(50)
  documentNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorization?: string;

  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  personName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  personIdentification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dueDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchaseOrderRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  seller?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  payWithPettyCash?: boolean;

  @IsOptional()
  @IsUUID()
  pettyCashAccountId?: string;

  @IsOptional()
  ice?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinancialDocumentLineDto)
  lines: FinancialDocumentLineDto[];
}
