import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductoWithLoteDto {
  // Product fields
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

  // Lot inventory fields
  @IsUUID()
  fkBodegaId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock: number;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vidaUtilPromedioPorUsos?: number;

  @IsString()
  @IsOptional()
  imgUrl?: string;
}
