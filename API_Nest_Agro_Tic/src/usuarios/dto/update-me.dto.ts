// src/usuarios/dto/update-me.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  IsNumber,
} from 'class-validator';

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  nombres?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  apellidos?: string;

  @IsNumber()
  @IsOptional()
  dni?: number;

  @IsNumber()
  @IsOptional()
  telefono?: number;

  @IsEmail()
  @IsOptional()
  @Length(1, 255)
  correo?: string;
}
