import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';

export class CreateZonaDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  nombre: string;

  @IsObject()
  coordenadas: {
    type: 'point' | 'polygon';
    coordinates:
      | { lat: number; lng: number }
      | Array<{ lat: number; lng: number }>;
  };

  @IsNumber()
  @IsOptional()
  areaMetrosCuadrados?: number;

  @IsString()
  @IsOptional()
  fkMapaId?: string;
}
