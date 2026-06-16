import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class BalanceSheetQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;
}

