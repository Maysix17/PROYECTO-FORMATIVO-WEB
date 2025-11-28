import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MqttConfig } from './mqtt_config.entity';
import { Zona } from '../../zonas/entities/zona.entity';
import { MedicionSensor } from '../../medicion_sensor/entities/medicion_sensor.entity';

@Entity('zona_mqtt_config')
export class ZonaMqttConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'pk_id_zona_mqtt_config' })
  id: string;

  @Column({ name: 'fk_id_mqtt_config' })
  fkMqttConfigId: string;

  @Column({ name: 'fk_id_zona' })
  fkZonaId: string;

  @Column({ name: 'zmc_estado', type: 'boolean', default: true })
  estado: boolean; // true = conectado/activado, false = desconectado/desactivado

  @Column({
    name: 'zmc_umbrales',
    type: 'jsonb',
    default: {} as any,
  })
  umbrales: Record<
    string,
    {
      minimo: number;
      maximo: number;
    }
  >;

  @CreateDateColumn({ name: 'zmc_created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'zmc_updated_at' })
  updatedAt: Date;

  @ManyToOne(() => MqttConfig, (mc) => mc.zonaMqttConfigs)
  @JoinColumn({ name: 'fk_id_mqtt_config' })
  mqttConfig?: MqttConfig;

  @ManyToOne(() => Zona, (z) => z.zonaMqttConfigs)
  @JoinColumn({ name: 'fk_id_zona' })
  zona?: Zona;

  @OneToMany(() => MedicionSensor, (ms) => ms.zonaMqttConfig)
  mediciones?: MedicionSensor[];
}
