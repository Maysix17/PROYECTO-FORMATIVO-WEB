import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsInt,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMovimientosInventarioDto {
  @IsUUID()
  fkLoteId: string;

  @IsUUID()
  @IsOptional()
  fkReservaId?: string;

  @IsInt()
  fkTipoMovimientoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  cantidad: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  observacion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  responsable?: string;
}
