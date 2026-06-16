import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class TrialBalanceQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
