import {
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountingTemplateLineDto } from './accounting-template-line.dto';

export class CreateAccountingTemplateDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  transactionType: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountingTemplateLineDto)
  lines: AccountingTemplateLineDto[];
}

