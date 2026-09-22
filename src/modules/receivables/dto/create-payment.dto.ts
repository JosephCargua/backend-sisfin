import { IsUUID, IsDateString, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsDateString()
  date: string;

  @IsUUID()
  @IsOptional()
  bankAccountId?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

