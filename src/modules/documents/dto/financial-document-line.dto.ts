import { IsEnum, IsInt, IsObject, IsOptional, Min } from 'class-validator';
import { FinancialDocumentLineType } from '../enums/financial-document-line-type.enum';

export class FinancialDocumentLineDto {
  @IsEnum(FinancialDocumentLineType)
  lineType: FinancialDocumentLineType;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsObject()
  data: Record<string, unknown>;
}
