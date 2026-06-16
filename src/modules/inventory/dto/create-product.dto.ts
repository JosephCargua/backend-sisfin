import { IsString, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost: number;
}

