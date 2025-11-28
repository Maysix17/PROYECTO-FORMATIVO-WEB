import { IsOptional, IsArray, IsString, IsUUID, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReportDataRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    return value;
  })
  med_keys?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    return value;
  })
  cultivo_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    return value;
  })
  zona_ids?: string[];

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsIn(['hourly', 'daily', 'weekly', 'time_slot'])
  group_by?: 'hourly' | 'daily' | 'weekly' | 'time_slot';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['morning', 'afternoon', 'evening', 'night'], { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v: string) => v.trim());
    }
    return value;
  })
  time_ranges?: ('morning' | 'afternoon' | 'evening' | 'night')[];

  @IsOptional()
  @IsIn(['morning', 'afternoon', 'evening', 'night'])
  time_range?: 'morning' | 'afternoon' | 'evening' | 'night';
}
