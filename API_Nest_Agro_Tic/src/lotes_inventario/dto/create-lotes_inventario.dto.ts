import {
  IsUUID,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateLotesInventarioDto {
  @IsUUID()
  fkProductoId: string;

  @IsUUID()
  fkBodegaId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock: number;

  @IsBoolean()
  esParcial: boolean;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;
}
