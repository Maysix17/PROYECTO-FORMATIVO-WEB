import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateEstadoFenologicoDto {
  @IsNotEmpty()
  @IsNumber()
  fk_estado_fenologico: number;
}
