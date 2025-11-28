import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';

export class CreateMqttConfigDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsString()
  @IsNotEmpty()
  port: string;

  @IsString()
  @IsNotEmpty()
  protocol: string;

  @IsString()
  @IsNotEmpty()
  topicBase: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
