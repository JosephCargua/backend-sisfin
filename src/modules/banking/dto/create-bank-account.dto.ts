import { IsString, IsUUID, MaxLength, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckSequenceDto {
  @IsString()
  @MaxLength(50)
  startSequence: string;

  @IsString()
  @MaxLength(50)
  endSequence: string;

  @IsBoolean()
  isActive: boolean;
}

export class CreateBankAccountDto {
  @IsString()
  @MaxLength(100)
  accountNumber: string;

  @IsString()
  @MaxLength(200)
  bankName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  checkFormat?: string;

  @IsOptional()
  @IsBoolean()
  forCollectionFormat?: boolean;

  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckSequenceDto)
  checkSequences?: CheckSequenceDto[];
}

