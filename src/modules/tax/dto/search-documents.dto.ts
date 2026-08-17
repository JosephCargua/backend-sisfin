import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentProcessingStatus } from '../enums/document-processing-status.enum';
import { DocumentReviewStatus } from '../enums/document-review-status.enum';

export enum DocumentPersonType {
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
}

export enum DocumentStatusFilter {
  ALL = 'ALL',
  PENDING = 'PENDING',
  ANNULLED = 'ANNULLED',
  COLLECTED = 'COLLECTED',
  PAID = 'PAID',
}

export enum DocumentEmissionFilter {
  ALL = 'ALL',
  FISICA = 'FISICA',
  ELECTRONICA = 'ELECTRONICA',
}

export class SearchDocumentsDto {
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  person?: string;

  @IsOptional()
  @IsString()
  documentTypeCode?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(DocumentPersonType)
  personType?: DocumentPersonType;

  @IsOptional()
  @IsEnum(DocumentStatusFilter)
  statusFilter?: DocumentStatusFilter;

  @IsOptional()
  @IsEnum(DocumentEmissionFilter)
  emissionFilter?: DocumentEmissionFilter;

  @IsOptional()
  @IsString()
  purchaseOrder?: string;
}
