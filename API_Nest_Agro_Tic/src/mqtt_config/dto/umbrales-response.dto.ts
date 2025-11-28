import { Expose } from 'class-transformer';

/**
 * DTO para respuesta individual de umbral de sensor
 */
export class UmbralResponseDto {
  @Expose()
  minimo: number;

  @Expose()
  maximo: number;
}

/**
 * DTO para respuesta completa de configuración de umbrales
 */
export class UmbralesResponseDto {
  @Expose()
  id: string;

  @Expose()
  fkZonaMqttConfigId: string;

  @Expose()
  umbrales: Record<string, UmbralResponseDto>;

  @Expose()
  estado: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Información adicional de la zona y configuración MQTT para contexto
  @Expose()
  zonaNombre?: string;

  @Expose()
  mqttConfigNombre?: string;

  @Expose()
  mqttConfigHost?: string;

  @Expose()
  mqttConfigPort?: number;
}

/**
 * DTO para respuesta de actualización de umbrales con mensajes de éxito
 */
export class UpdateUmbralesResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  message: string;

  @Expose()
  data?: UmbralesResponseDto;

  @Expose()
  timestamp: Date;
}
