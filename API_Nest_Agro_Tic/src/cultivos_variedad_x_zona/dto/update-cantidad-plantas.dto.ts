import { IsInt } from 'class-validator';

export class UpdateCantidadPlantasDto {
  @IsInt()
  cantidad_plantas: number;
}
