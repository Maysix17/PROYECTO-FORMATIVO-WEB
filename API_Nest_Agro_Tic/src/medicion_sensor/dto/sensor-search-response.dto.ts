import { Expose } from 'class-transformer';

export class SensorConfigDto {
  @Expose()
  id: string;

  @Expose()
  nombre: string;

  @Expose()
  host: string;

  @Expose()
  port: number;

  @Expose()
  protocol: string;

  @Expose()
  topicBase: string;
}

export class UniqueSensorDataDto {
  @Expose()
  key: string;

  @Expose()
  unidad: string;

  @Expose()
  valor: number;

  @Expose()
  fechaMedicion: Date;
}

export class CultivoZonaSensorDto {
  @Expose()
  cultivoId: string;

  @Expose()
  cultivoNombre: string;

  @Expose()
  variedadNombre: string;

  @Expose()
  tipoCultivoNombre: string;

  @Expose()
  zonaId: string;

  @Expose()
  zonaNombre: string;

  @Expose()
  cvzId: string;

  @Expose()
  sensorConfig: SensorConfigDto;

  @Expose()
  uniqueSensorData: UniqueSensorDataDto[];
}

export class SensorSearchResponseDto {
  @Expose()
  results: CultivoZonaSensorDto[];
}
