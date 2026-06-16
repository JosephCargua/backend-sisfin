import { IsUUID, IsDateString, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  customerId: string;

  @IsDateString()
  date: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;
}

