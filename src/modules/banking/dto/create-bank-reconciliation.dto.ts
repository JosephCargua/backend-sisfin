import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsString,
  IsOptional,
  IsArray
} from 'class-validator';

export class CreateBankReconciliationDto {
  @IsUUID()
  bankAccountId: string;

  @IsDateString()
  reconciliationDate: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  statementBalance: number;

  @IsNumber()
  @IsOptional()
  accountingBalance?: number;

  @IsNumber()
  @IsOptional()
  difference?: number;

  @IsArray()
  @IsOptional()
  transactionIds?: string[];
}
