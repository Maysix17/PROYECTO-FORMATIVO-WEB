import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class MultipleHarvestDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  cantidad: number;
}

export class CreateVentaDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  cantidad: number;

  @IsString()
  @IsOptional()
  fecha?: string;

  @IsString()
  @IsNotEmpty()
  fkCosechaId: string;

  @IsString()
  @IsNotEmpty()
  unidadMedida: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  precioUnitario: number;

  @IsNumber()
  @IsOptional()
  precioKilo?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MultipleHarvestDto)
  multipleHarvests?: MultipleHarvestDto[];
}
