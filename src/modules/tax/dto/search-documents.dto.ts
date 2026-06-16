import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentProcessingStatus } from '../enums/document-processing-status.enum';
import { DocumentReviewStatus } from '../enums/document-review-status.enum';

export enum DocumentPersonType {
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
}

export enum DocumentQuickFilter {
  ELECTRONIC = 'ELECTRONIC',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RETENTION_PENDING = 'RETENTION_PENDING',
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
  @IsEnum(DocumentReviewStatus)
  reviewStatus?: DocumentReviewStatus;

  @IsOptional()
  @IsEnum(DocumentProcessingStatus)
  processingStatus?: DocumentProcessingStatus;

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
  @IsEnum(DocumentQuickFilter)
  quickFilter?: DocumentQuickFilter;

  @IsOptional()
  @IsString()
  purchaseOrder?: string;
}
