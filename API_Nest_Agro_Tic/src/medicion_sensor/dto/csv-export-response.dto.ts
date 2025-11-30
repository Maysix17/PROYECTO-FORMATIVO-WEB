import { Expose } from 'class-transformer';

export class CsvSensorDataPointDto {
  @Expose()
  timestamp: string;

  @Expose()
  sensor_id: string;

  @Expose()
  value: number;

  @Expose()
  unit: string;

  @Expose()
  crop_name: string;

  @Expose()
  zone_name: string;

  @Expose()
  variety_name: string;

  @Expose()
  crop_type_name: string;
}

export class CsvExportResponseDto {
  @Expose()
  data: CsvSensorDataPointDto[];

  @Expose()
  totalRecords: number;
}