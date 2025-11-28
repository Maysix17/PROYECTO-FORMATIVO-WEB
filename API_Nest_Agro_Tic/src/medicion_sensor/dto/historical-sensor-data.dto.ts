import { IsArray, IsString } from 'class-validator';

export class HistoricalSensorDataRequestDto {
  @IsArray()
  @IsString({ each: true })
  sensorKeys: string[];
}

export class HistoricalSensorDataPointDto {
  timestamp: string;
  sensorKey: string;
  value: number;
  unidad: string;
  cultivoNombre: string;
  zonaNombre: string;
  variedadNombre: string;
}

export class SensorAverageDto {
  sensorKey: string;
  average: number;
  count: number;
  unidad: string;
}

export class HistoricalSensorDataResponseDto {
  dataPoints: HistoricalSensorDataPointDto[];
  averages: SensorAverageDto[];
  dateRange: {
    start: string;
    end: string;
  };
}
