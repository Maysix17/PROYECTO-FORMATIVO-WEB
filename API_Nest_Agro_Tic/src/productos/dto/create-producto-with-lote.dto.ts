import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  MaxLength,
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
  precioCompra: number;

  @IsNumber({ maxDecimalPlaces: 2 })
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
  stock: number;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsNumber()
  @IsOptional()
  vidaUtilPromedioPorUsos?: number;

  @IsString()
  @IsOptional()
  imgUrl?: string;
}