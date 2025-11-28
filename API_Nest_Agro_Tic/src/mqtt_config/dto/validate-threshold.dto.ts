import { IsString, IsNumber } from 'class-validator';

/**
 * DTO para validar si un valor excede los umbrales establecidos
 */
export class ValidateThresholdDto {
  @IsString()
  sensorType: string;

  @IsNumber()
  value: number;
}
