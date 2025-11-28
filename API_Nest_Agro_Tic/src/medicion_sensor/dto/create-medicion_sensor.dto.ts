import {
  IsNotEmpty,
  IsNumber,
  IsDate,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicionSensorDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNumber()
  @IsNotEmpty()
  valor: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  fechaMedicion: Date;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsString()
  @IsNotEmpty()
  fkZonaMqttConfigId: string;
}
