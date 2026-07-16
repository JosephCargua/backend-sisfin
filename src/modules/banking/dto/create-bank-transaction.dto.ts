import { 
  IsUUID, 
  IsDateString, 
  IsString, 
  IsNumber, 
  MaxLength, 
  IsBoolean, 
  IsOptional, 
  ValidateNested, 
  IsArray 
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBankTransactionDetailDto {
  @IsString()
  @MaxLength(150)
  accountName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  costCenter?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  project?: string;
}

export class CreateBankTransactionDto {
  @IsUUID()
  bankAccountId: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @IsString()
  type: string;

  // Nuevos campos
  @IsString()
  @IsOptional()
  @MaxLength(20)
  transactionType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @IsBoolean()
  @IsOptional()
  isAnnulled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  personName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  payToOrderOf?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  checkNumber?: string;

  @IsDateString()
  @IsOptional()
  checkDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBankTransactionDetailDto)
  details: CreateBankTransactionDetailDto[];
}

