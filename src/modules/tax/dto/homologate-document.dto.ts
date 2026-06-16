import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class HomologateDocumentDto {
  @IsOptional()
  @IsUUID()
  payableAccountId?: string;

  @IsOptional()
  @IsUUID()
  tipAccountId?: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsUUID()
  recurringAccountId?: string;

  @IsOptional()
  @IsBoolean()
  useRecurringAccount?: boolean;

  @IsOptional()
  @IsString()
  retentionIrCode?: string;

  @IsOptional()
  @IsString()
  retentionIvaCode?: string;

  @IsOptional()
  @IsBoolean()
  generateRetention?: boolean;

  @IsOptional()
  @IsBoolean()
  updatePersonData?: boolean;
}
