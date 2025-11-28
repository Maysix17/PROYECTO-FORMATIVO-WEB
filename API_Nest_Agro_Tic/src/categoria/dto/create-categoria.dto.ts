import {
  IsNotEmpty,
  IsString,
  Length,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateCategoriaDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres.' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser un texto.' })
  @IsOptional()
  descripcion?: string;

  @IsBoolean({ message: 'esDivisible debe ser un valor booleano.' })
  @IsOptional()
  esDivisible?: boolean;
}
