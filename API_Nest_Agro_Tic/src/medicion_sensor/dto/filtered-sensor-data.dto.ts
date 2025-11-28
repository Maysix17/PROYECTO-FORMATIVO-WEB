import { IsArray, IsOptional, IsString, IsIn, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilteredSensorDataDto {
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    return value;
  })
  med_keys: string[];

  @IsOptional()
  @IsUUID()
  zona_id?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsIn(['hourly', 'daily', 'weekly'])
  group_by?: 'hourly' | 'daily' | 'weekly';
}
