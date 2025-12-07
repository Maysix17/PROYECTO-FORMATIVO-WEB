import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductosDto {
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioCompra: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  capacidadPresentacion: number;

  @IsUUID()
  @IsOptional()
  fkCategoriaId?: string;

  @IsUUID()
  @IsOptional()
  fkUnidadMedidaId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vidaUtilPromedioPorUsos?: number;

  @IsString()
  @IsOptional()
  imgUrl?: string;
}
