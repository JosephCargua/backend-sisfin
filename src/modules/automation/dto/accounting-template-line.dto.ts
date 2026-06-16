import { IsUUID, IsString, IsInt, IsOptional, MaxLength } from 'class-validator';

export class AccountingTemplateLineDto {
  @IsUUID()
  accountId: string;

  @IsString()
  @MaxLength(20)
  side: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  formula?: string;

  @IsInt()
  order: number;
}

