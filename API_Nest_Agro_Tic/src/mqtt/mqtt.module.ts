import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MqttGateway } from './mqtt.gateway';
import { MqttConfigModule } from '../mqtt_config/mqtt_config.module';
import { MqttConfigController } from '../mqtt_config/mqtt_config.controller';
import { MedicionSensorModule } from '../medicion_sensor/medicion_sensor.module';

@Module({
  imports: [MqttConfigModule, MedicionSensorModule],
  controllers: [MqttConfigController],
  providers: [MqttService, MqttGateway],
  exports: [MqttService, MqttGateway],
})
export class MqttModule {}
