import { Expose } from 'class-transformer';

export class SensorStatisticsDto {
  @Expose()
  med_key: string;

  @Expose()
  count: number;

  @Expose()
  min: number;

  @Expose()
  max: number;

  @Expose()
  avg: number;

  @Expose()
  sum: number;

  @Expose()
  stddev: number;
}

export class ReportDataResponseDto {
  @Expose()
  cultivoId: string;

  @Expose()
  cultivoNombre: string;

  @Expose()
  variedadNombre: string;

  @Expose()
  zonaId: string;

  @Expose()
  zonaNombre: string;

  @Expose()
  cvzId: string;

  @Expose()
  period: string; // e.g., "2023-01-01" for daily, "2023-01-01 10:00" for hourly

  @Expose()
  statistics: SensorStatisticsDto[];
}
