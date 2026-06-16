import { IsDateString, IsOptional, IsUUID, IsString } from 'class-validator';

export class IncomeStatementQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  signatures?: string;
}

