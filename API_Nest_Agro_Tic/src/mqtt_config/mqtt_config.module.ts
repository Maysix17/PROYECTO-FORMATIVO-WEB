import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttConfigService } from './mqtt_config.service';
import { MqttConfig } from './entities/mqtt_config.entity';
import { ZonaMqttConfig } from './entities/zona_mqtt_config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MqttConfig, ZonaMqttConfig])],
  providers: [MqttConfigService],
  exports: [MqttConfigService],
})
export class MqttConfigModule {}
