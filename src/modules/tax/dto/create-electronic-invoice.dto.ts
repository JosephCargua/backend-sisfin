import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineDto {
  @IsString()
  @MaxLength(200)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount: number;

  @IsString()
  @MaxLength(10)
  taxCode: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  taxRate: number;
}

export class CreateElectronicInvoiceDto {
  @IsDateString()
  issueDate: string;

  @IsString()
  @Length(10, 13)
  customerIdentification: string;

  @IsString()
  @MaxLength(200)
  customerName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  environment?: string;
}

