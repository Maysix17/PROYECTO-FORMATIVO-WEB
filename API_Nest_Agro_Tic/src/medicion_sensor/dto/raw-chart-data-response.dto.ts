import { Expose } from 'class-transformer';

export class RawSensorDataPointDto {
  @Expose()
  timestamp: string;

  @Expose()
  sensorKey: string;

  @Expose()
  value: number;

  @Expose()
  unidad: string;

  @Expose()
  zonaNombre: string;

  @Expose()
  cultivoNombre: string;

  @Expose()
  variedadNombre: string;
}

export class RawChartDataResponseDto {
  @Expose()
  dataPoints: RawSensorDataPointDto[];

  @Expose()
  totalPoints: number;

  @Expose()
  dateRange: {
    start: string;
    end: string;
  };
}
