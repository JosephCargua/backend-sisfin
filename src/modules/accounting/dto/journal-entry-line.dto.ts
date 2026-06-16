import { IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class JournalEntryLineDto {
  @IsUUID()
  accountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

