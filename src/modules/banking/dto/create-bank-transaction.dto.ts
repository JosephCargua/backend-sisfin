import { IsUUID, IsDateString, IsString, IsNumber, MaxLength } from 'class-validator';

export class CreateBankTransactionDto {
  @IsUUID()
  bankAccountId: string;

  @IsDateString()
  date: string;

  @IsString()
  @MaxLength(200)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @IsString()
  type: string;
}

