import {
  IsString,
  IsNotEmpty,
  Length,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateTipoCultivoDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  nombre: string;

  @IsBoolean()
  @IsOptional()
  esPerenne?: boolean;
}
