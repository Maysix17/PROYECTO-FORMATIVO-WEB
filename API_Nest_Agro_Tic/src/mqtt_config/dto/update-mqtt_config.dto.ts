import { PartialType } from '@nestjs/mapped-types';
import { CreateMqttConfigDto } from './create-mqtt_config.dto';

export class UpdateMqttConfigDto extends PartialType(CreateMqttConfigDto) {}
