import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class FinanzasDataDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  fkCosechaId: string;

  @IsNumber()
  cantidadCosechada: number;

  @IsNumber()
  precioPorKilo: number;

  @IsOptional()
  @IsDateString()
  fechaVenta?: string;

  @IsNumber()
  cantidadVendida: number;

  @IsNumber()
  costoInventario: number;

  @IsNumber()
  costoManoObra: number;

  @IsNumber()
  costoTotalProduccion: number;

  @IsNumber()
  ingresosTotales: number;

  @IsNumber()
  ganancias: number;

  @IsNumber()
  margenGanancia: number;

  @IsDateString()
  fechaCalculo: Date;
}
