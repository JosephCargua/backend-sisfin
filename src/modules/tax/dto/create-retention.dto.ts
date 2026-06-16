import {
  IsString,
  IsDateString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  MaxLength,
  Length,
} from 'class-validator';
import { RetentionType } from '../entities/retention.entity';

export class CreateRetentionDto {
  @IsDateString()
  issueDate: string;

  @IsString()
  @Length(10, 13)
  supplierIdentification: string;

  @IsString()
  @MaxLength(200)
  supplierName: string;

  @IsEnum(RetentionType)
  type: RetentionType;

  @IsString()
  @MaxLength(10)
  retentionCode: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  retentionRate: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  environment?: string;
}

