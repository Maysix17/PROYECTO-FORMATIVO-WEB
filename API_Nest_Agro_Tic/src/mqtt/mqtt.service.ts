import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { MqttConfigService } from '../mqtt_config/mqtt_config.service';
import { MedicionSensorService } from '../medicion_sensor/medicion_sensor.service';
import { MqttGateway } from './mqtt.gateway';

interface MqttConnection {
  client: mqtt.MqttClient;
  configId: string;
  zonaMqttConfigId: string;
  zonaId: string;
  topic: string;
  connected: boolean;
}

interface BufferedReading {
  key: string;
  valor: number;
  unidad: string;
  fechaMedicion: Date;
  fkZonaMqttConfigId: string;
  tipo?: string;
}

@Injectable()
export class MqttService implements OnModuleInit {
  private connections = new Map<string, MqttConnection>(); // configId -> connection
  private logger = new Logger(MqttService.name);
  private readingBuffers = new Map<string, BufferedReading[]>(); // zonaMqttConfigId -> readings
  private lastSaveTimes = new Map<string, Date>(); // zonaMqttConfigId -> last save time
  private firstReadingSaved = new Set<string>(); // zonaMqttConfigId -> has first reading been saved
  private readonly SAVE_INTERVAL = 30 * 60 * 1000; // 30 seconds in milliseconds

  constructor(
    private readonly mqttConfigService: MqttConfigService,
    private readonly medicionSensorService: MedicionSensorService,
    private readonly mqttGateway: MqttGateway,
  ) {}
  //El método onModuleInit() se ejecuta automáticamente cuando NestJS inicia el módulo, llamando a initializeConnections() que obtiene todas las configuraciones activas y crea las conexiones MQTT correspondientes.
  async onModuleInit() {
    await this.initializeConnections();
  }

  private async initializeConnections() {
    try {
      const activeZonaMqttConfigs =
        await this.mqttConfigService.findActiveZonaMqttConfigs();
      this.logger.log(
        `Inicializando ${activeZonaMqttConfigs.length} conexiones MQTT activas`,
      );

      for (const zonaMqttConfig of activeZonaMqttConfigs) {
        await this.createConnection(zonaMqttConfig);
      }
    } catch (error) {
      this.logger.error('Error inicializando conexiones MQTT:', error);
    }
  }

  private async createConnection(zonaMqttConfig: any) {
    try {
      const config = zonaMqttConfig.mqttConfig;
      const zona = zonaMqttConfig.zona;

      // Validar que el tópico no esté siendo usado por otra zona activa
      const isTopicUnique = await this.validateUniqueTopic(
        config.topicBase,
        zona.id,
      );
      if (!isTopicUnique) {
        this.logger.error(
          `Tópico ${config.topicBase} ya está siendo usado por otra zona activa`,
        );
        this.emitConnectionStatus(
          zona.id,
          false,
          'Error: Tópico MQTT ya en uso por otra zona',
        );
        return;
      }

      const brokerUrl = this.buildBrokerUrl(config);
      this.logger.log(`Conectando a ${brokerUrl} para zona ${zona.id}`);

      const client = mqtt.connect(brokerUrl);

      const connection: MqttConnection = {
        client,
        configId: config.id,
        zonaMqttConfigId: zonaMqttConfig.id,
        zonaId: zona.id,
        topic: config.topicBase,
        connected: false,
      };

      this.connections.set(config.id, connection);

      // Emitir estado inicial de conexión
      this.emitConnectionStatus(zona.id, false, 'Conectando al broker...');

      client.on('connect', () => {
        this.logger.log(`Conectado a MQTT para zona ${zona.id}`);
        connection.connected = true;
        this.emitConnectionStatus(zona.id, true, 'Conexión exitosa al broker');

        // Suscribirse al tópico
        client.subscribe(config.topicBase, (err) => {
          if (err) {
            this.logger.error(
              `Error suscribiéndose a ${config.topicBase}:`,
              err,
            );
            this.emitConnectionStatus(
              zona.id,
              false,
              `Error al suscribirse: ${err.message}`,
            );
          } else {
            this.logger.log(
              `Suscrito a tópico ${config.topicBase} para zona ${zona.id}`,
            );
            this.emitConnectionStatus(
              zona.id,
              true,
              'Suscripción exitosa - listo para recibir datos',
            );
          }
        });
      });

      client.on('disconnect', () => {
        this.logger.warn(`Desconectado MQTT para zona ${zona.id}`);
        connection.connected = false;
        this.emitConnectionStatus(
          zona.id,
          false,
          'Desconectado del broker MQTT',
        );
      });

      client.on('error', (error) => {
        this.logger.error(`Error MQTT para zona ${zona.id}:`, error);
        connection.connected = false;
        this.emitConnectionStatus(
          zona.id,
          false,
          `Error de conexión: ${error.message}`,
        );
      });

      client.on('message', async (topic, message) => {
        await this.handleIncomingMessage(topic, message, zonaMqttConfig);
      });

      client.on('offline', () => {
        this.logger.warn(`Cliente MQTT offline para zona ${zona.id}`);
        connection.connected = false;
        this.emitConnectionStatus(
          zona.id,
          false,
          'Sin conexión a internet - modo offline',
        );
      });

      client.on('reconnect', () => {
        this.logger.log(`Reintentando conexión MQTT para zona ${zona.id}...`);
        this.emitConnectionStatus(zona.id, false, 'Reintentando conexión...');
      });
    } catch (error) {
      this.logger.error(
        `Error creando conexión para zona ${zonaMqttConfig.zona.id}:`,
        error,
      );
      this.emitConnectionStatus(
        zonaMqttConfig.zona.id,
        false,
        `Error de configuración: ${error.message}`,
      );
    }
  }

  private buildBrokerUrl(config: any): string {
    const protocol =
      config.protocol === 'wss'
        ? 'wss'
        : config.protocol === 'ws'
          ? 'ws'
          : 'mqtt';
    const port =
      config.port ||
      (protocol === 'wss' ? 8884 : protocol === 'ws' ? 8883 : 1883);
    return `${protocol}://${config.host}:${port}`;
  }

  // Método para agregar nueva conexión cuando se asigna una config a zona
  async addConnection(zonaMqttConfig: any) {
    // Para configuraciones globales (sin zona específica), crear una conexión dummy
    if (!zonaMqttConfig.zona) {
      this.logger.log(
        `Configuración global ${zonaMqttConfig.nombre} guardada. Conexión MQTT se intentará cuando se asigne a una zona.`,
      );
      return;
    }
    await this.createConnection(zonaMqttConfig);
  }

  // Método para remover conexión cuando se desactiva una asignación zona-config
  async removeConnection(zonaMqttConfigId: string) {
    // Find connection by zonaMqttConfigId
    for (const [configId, connection] of this.connections) {
      if (connection.zonaMqttConfigId === zonaMqttConfigId) {
        connection.client.end();
        this.connections.delete(configId);
        // Reset first reading flag when connection is removed
        this.firstReadingSaved.delete(zonaMqttConfigId);
        this.logger.log(
          `Conexión removida para zonaMqttConfig ${zonaMqttConfigId}`,
        );
        this.emitConnectionStatus(
          connection.zonaId,
          false,
          'Configuración desactivada',
        );
        break;
      }
    }
  }

  // Método para refrescar conexiones (cuando cambian configs)
  async refreshConnections() {
    // Cerrar todas las conexiones existentes
    for (const [configId, connection] of this.connections) {
      connection.client.end();
    }
    this.connections.clear();
    // Reset first reading flags when refreshing connections
    this.firstReadingSaved.clear();

    // Recrear conexiones con configs activas
    await this.initializeConnections();
  }

  private async handleIncomingMessage(
    topic: string,
    message: Buffer,
    zonaMqttConfig: any,
  ) {
    try {
      const payload = JSON.parse(message.toString());
      this.logger.log(
        `Mensaje recibido en ${topic} para zona ${zonaMqttConfig.zona.id}:`,
        payload,
      );

      // Ensure zonaMqttConfig has relations loaded
      const zonaMqttConfigWithRelations =
        await this.mqttConfigService.getZonaMqttConfigWithRelations(
          zonaMqttConfig.id,
        );

      if (!zonaMqttConfigWithRelations) {
        this.logger.error(
          `No se encontró configuración MQTT para ID ${zonaMqttConfig.id}`,
        );
        return;
      }

      await this.processSensorData(
        zonaMqttConfigWithRelations.id,
        zonaMqttConfigWithRelations.zona?.id || zonaMqttConfig.zona.id,
        payload,
        zonaMqttConfigWithRelations,
      );
    } catch (error) {
      this.logger.error('Error procesando mensaje MQTT:', error);
    }
  }

  private async processSensorData(
    zonaMqttConfigId: string,
    zonaId: string,
    payload: any,
    zonaMqttConfig?: any,
  ) {
    try {
      this.logger.debug(`📡 Procesando datos MQTT para zona ${zonaId}`);
      this.logger.debug(`📡 Payload recibido:`, payload);

      // Verificar que la zona MQTT config esté activa antes de procesar
      const isActive =
        await this.mqttConfigService.isZonaMqttConfigActive(zonaMqttConfigId);
      if (!isActive) {
        this.logger.warn(
          `Datos MQTT recibidos para zona inactiva ${zonaId}, ignorando`,
        );
        return;
      }

      const realTimeMediciones: any[] = [];
      const alertMediciones: BufferedReading[] = [];

      // Convertir cada key del payload en una medición
      Object.entries(payload).forEach(([key, value]) => {
        this.logger.debug(`🔄 Procesando sensor ${key} con valor: ${value}`);
        if (typeof value === 'string' || typeof value === 'number') {
          // Extraer valor numérico y unidad si es posible
          const parsed = this.parseValueWithUnit(String(value));
          this.logger.debug(
            `🔄 Valor parseado para ${key}: ${parsed.n} ${parsed.unit}`,
          );

          const medicion = {
            key,
            valor: parsed.n,
            unidad: parsed.unit,
            fechaMedicion: new Date(),
            fkZonaMqttConfigId: zonaMqttConfigId,
            tipo: 'regular',
          };

          realTimeMediciones.push(medicion);

          // Agregar TODOS los datos al buffer para guardado periódico
          this.addToBuffer(zonaMqttConfigId, medicion);

          // Verificar si el valor excede los umbrales
          const isAlert = this.checkThresholdBreach(
            key,
            parsed.n,
            zonaMqttConfig,
          );
          this.logger.debug(
            `🔍 Resultado checkThresholdBreach para ${key}: ${isAlert}`,
          );

          if (isAlert) {
            this.logger.warn(
              `🚨 ALERTA: Umbral excedido para sensor ${key} en zona ${zonaId}: valor ${parsed.n}`,
            );
            // Agregar a mediciones de alerta para guardado inmediato
            alertMediciones.push({
              ...medicion,
              tipo: 'alerta',
            });
            this.logger.debug(`📝 Agregada medición de alerta para ${key}:`, {
              ...medicion,
              tipo: 'alerta',
            });
          }
        } else {
          this.logger.warn(
            `⚠️ Valor no válido para sensor ${key}: ${value} (tipo: ${typeof value})`,
          );
        }
      });

      if (realTimeMediciones.length > 0) {
        // Emitir lecturas en tiempo real inmediatamente (todos los datos)
        this.mqttGateway.emitNuevaLectura({
          zonaId,
          mediciones: realTimeMediciones,
          timestamp: new Date(),
        });

        // Guardar inmediatamente si hay alertas
        if (alertMediciones.length > 0) {
          await this.saveAlertReadingsImmediately(
            zonaMqttConfigId,
            alertMediciones,
          );
        }

        // Verificar guardado periódico (cada 30 segundos)
        await this.checkAndSaveBufferedReadings(zonaMqttConfigId);
      }
    } catch (error) {
      this.logger.error('Error procesando datos del sensor:', error);
    }
  }

  private addToBuffer(zonaMqttConfigId: string, medicion: BufferedReading) {
    if (!this.readingBuffers.has(zonaMqttConfigId)) {
      this.readingBuffers.set(zonaMqttConfigId, []);
    }
    this.readingBuffers.get(zonaMqttConfigId)!.push(medicion);
  }

  private parseValueWithUnit(raw: string) {
    const s = String(raw).trim();
    if (s.includes('N/A')) {
      return { n: -999, unit: 'N/A' };
    }
    const m = s.match(/^(-?\d+(?:\.\d+)?)(?:\s*)(.*)$/);
    if (m) {
      return { n: parseFloat(m[1]), unit: (m[2] || '').trim() };
    }
    return { n: NaN, unit: '' };
  }

  private async validateUniqueTopic(
    topicBase: string,
    zonaId: string,
  ): Promise<boolean> {
    // Verificar si alguna zona_mqtt_config ACTIVA usa el mismo tópico para otra zona
    // basado en zmc_estado, no en el estado de conexión MQTT
    const activeZonaMqttConfig =
      await this.mqttConfigService.findActiveZonaMqttConfigByTopicAndZona(
        topicBase,
        zonaId,
      );

    // Si existe una configuración activa con el mismo tópico en otra zona, bloquear
    return !activeZonaMqttConfig;
  }

  private emitConnectionStatus(
    zonaId: string,
    conectado: boolean,
    mensaje: string,
  ) {
    this.mqttGateway.emitEstadoConexion({ zonaId, conectado, mensaje });
  }

  // Método público para verificar estado de una zona específica
  getConnectionStatus(zonaId: string): boolean {
    for (const connection of this.connections.values()) {
      if (connection.zonaId === zonaId) {
        return connection.connected;
      }
    }
    return false;
  }

  private checkThresholdBreach(
    sensorKey: string,
    value: number,
    zonaMqttConfig: any,
  ): boolean {
    try {
      // Skip threshold check for N/A values
      if (value === -999) return false;

      this.logger.debug(
        `🔍 Verificando umbral para sensor ${sensorKey}, valor: ${value}`,
      );
      this.logger.debug(`🔍 ZonaMqttConfig ID: ${zonaMqttConfig?.id}`);
      this.logger.debug(
        `🔍 MqttConfig umbrales:`,
        zonaMqttConfig?.mqttConfig?.umbrales,
      );

      const thresholds = zonaMqttConfig.mqttConfig?.umbrales as Record<
        string,
        { minimo: number; maximo: number }
      >;

      if (!thresholds) {
        this.logger.warn(`⚠️ No hay umbrales definidos en mqttConfig`);
        return false;
      }

      if (!thresholds[sensorKey]) {
        this.logger.warn(`⚠️ No hay umbral definido para sensor ${sensorKey}`);
        return false;
      }

      const { minimo, maximo } = thresholds[sensorKey];
      this.logger.debug(
        `🔍 Umbral para ${sensorKey}: min=${minimo}, max=${maximo}`,
      );

      const exceeds = value < minimo || value > maximo;
      this.logger.debug(`🔍 ¿Excede umbral? ${exceeds} (valor: ${value})`);

      return exceeds;
    } catch (error) {
      this.logger.error(
        `❌ Error verificando umbral para sensor ${sensorKey}:`,
        error,
      );
      return false;
    }
  }

  private async checkAndSaveBufferedReadings(zonaMqttConfigId: string) {
    const buffer = this.readingBuffers.get(zonaMqttConfigId);
    if (!buffer || buffer.length === 0) return;

    const lastSave = this.lastSaveTimes.get(zonaMqttConfigId);
    const now = new Date();
    const isFirstReading = !this.firstReadingSaved.has(zonaMqttConfigId);
    const shouldSaveHourly =
      !lastSave || now.getTime() - lastSave.getTime() >= this.SAVE_INTERVAL;

    // Save immediately if it's the first reading OR if 30 seconds have passed
    if (isFirstReading || shouldSaveHourly) {
      try {
        const saved = await this.medicionSensorService.saveBatch(buffer);
        this.logger.log(
          `Guardadas ${saved.length} mediciones ${isFirstReading ? 'iniciales' : 'periódicas'} en BD para zonaMqttConfig ${zonaMqttConfigId}`,
        );

        // Mark first reading as saved and update last save time
        if (isFirstReading) {
          this.firstReadingSaved.add(zonaMqttConfigId);
        }
        this.lastSaveTimes.set(zonaMqttConfigId, now);

        // Limpiar buffer
        this.readingBuffers.set(zonaMqttConfigId, []);
      } catch (error) {
        this.logger.error(
          `Error guardando mediciones ${isFirstReading ? 'iniciales' : 'periódicas'} en BD:`,
          error,
        );
      }
    }
  }

  private async saveAlertReadingsImmediately(
    zonaMqttConfigId: string,
    alertMediciones: BufferedReading[],
  ) {
    this.logger.log(
      `💾 Intentando guardar ${alertMediciones.length} mediciones de alerta para zonaMqttConfig ${zonaMqttConfigId}`,
    );

    if (alertMediciones.length > 0) {
      try {
        this.logger.debug('Alert mediciones a guardar:', alertMediciones);
        const saved =
          await this.medicionSensorService.saveBatch(alertMediciones);
        this.logger.log(
          `✅ Guardadas ${saved.length} mediciones de alerta en BD para zonaMqttConfig ${zonaMqttConfigId}`,
        );
      } catch (error) {
        this.logger.error(
          '❌ Error guardando mediciones de alerta en BD:',
          error,
        );
        // Log more details about the error
        if (error instanceof Error) {
          this.logger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }
      }
    } else {
      this.logger.warn('⚠️ No hay mediciones de alerta para guardar');
    }
  }
}
