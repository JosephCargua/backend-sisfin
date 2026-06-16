import { IsUUID, IsString, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateInventoryMovementDto {
  @IsUUID()
  productId: string;

  @IsString()
  type: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost: number;

  @IsDateString()
  date: string;
}

