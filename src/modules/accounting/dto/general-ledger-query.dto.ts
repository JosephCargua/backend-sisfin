import { IsDateString, IsUUID, IsOptional } from 'class-validator';

export class GeneralLedgerQueryDto {
  @IsUUID()
  accountId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;
}

