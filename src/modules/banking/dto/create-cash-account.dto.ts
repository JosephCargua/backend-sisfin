import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCashAccountDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsUUID()
  accountId: string;
}

