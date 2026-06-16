import { IsUUID, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsUUID()
  supplierInvoiceId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsDateString()
  date: string;
}

