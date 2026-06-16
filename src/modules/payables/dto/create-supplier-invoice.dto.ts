import { IsUUID, IsDateString, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateSupplierInvoiceDto {
  @IsUUID()
  supplierId: string;

  @IsDateString()
  date: string;

  @IsDateString()
  dueDate: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;
}

