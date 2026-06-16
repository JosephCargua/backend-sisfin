import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @MaxLength(100)
  accountNumber: string;

  @IsString()
  @MaxLength(200)
  bankName: string;

  @IsUUID()
  accountId: string;
}

