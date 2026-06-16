import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LineMappingType } from '../enums/line-mapping-type.enum';

export class HomologateLineItemDto {
  @IsEnum(LineMappingType)
  mappingType: LineMappingType;

  @IsOptional()
  @IsString()
  internalCode?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsUUID()
  mappedProductId?: string;

  @IsOptional()
  @IsUUID()
  mappedAccountId?: string;
}
