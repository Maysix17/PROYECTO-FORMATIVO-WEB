import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCategoriaActividadDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
