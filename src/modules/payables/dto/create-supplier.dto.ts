import { IsString, MaxLength, Length } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @Length(10, 13)
  identification: string;

  @IsString()
  @MaxLength(200)
  name: string;
}

