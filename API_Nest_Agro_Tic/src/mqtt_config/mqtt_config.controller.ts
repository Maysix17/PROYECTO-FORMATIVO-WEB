import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  Put,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { MqttConfigService } from './mqtt_config.service';
import { CreateMqttConfigDto } from './dto/create-mqtt_config.dto';
import { UpdateMqttConfigDto } from './dto/update-mqtt_config.dto';
import { UpdateUmbralesDto } from './dto/update-umbrales.dto';
import {
  UmbralesResponseDto,
  UpdateUmbralesResponseDto,
} from './dto/umbrales-response.dto';
import { ValidateThresholdDto } from './dto/validate-threshold.dto';
import { MqttService } from '../mqtt/mqtt.service';

@Controller('mqtt-config')
export class MqttConfigController {
  constructor(
    private readonly mqttConfigService: MqttConfigService,
    private readonly mqttService: MqttService,
  ) {}

  @Post()
  async create(@Body() createMqttConfigDto: CreateMqttConfigDto) {
    const config = await this.mqttConfigService.create(createMqttConfigDto);

    // Si la configuración está activa, intentar crear conexión MQTT en segundo plano
    // No bloquear el guardado si falla la conexión
    if (config.activa) {
      try {
        // Crear una conexión dummy para validar que la configuración es correcta
        // pero no bloquear el guardado si falla
        setImmediate(async () => {
          try {
            await this.mqttService.addConnection(config);
          } catch (error) {
            console.error(
              'Error creando conexión MQTT para nueva configuración:',
              error,
            );
            // No propagar el error - la configuración se guardó correctamente
          }
        });
      } catch (error) {
        console.error('Error iniciando conexión MQTT en segundo plano:', error);
        // No propagar el error
      }
    }

    return config;
  }

  @Get()
  findAll() {
    return this.mqttConfigService.findAll();
  }

  @Get('active')
  findActive() {
    return this.mqttConfigService.findActive();
  }

  @Get('zona/:zonaId')
  findByZona(@Param('zonaId') zonaId: string) {
    return this.mqttConfigService.findByZona(zonaId);
  }

  @Get('zona/:zonaId/configs')
  getZonaMqttConfigs(@Param('zonaId') zonaId: string) {
    return this.mqttConfigService.getZonaMqttConfigs(zonaId);
  }

  @Get(':configId/zona-mqtt-configs')
  getZonaMqttConfigsByConfig(@Param('configId') configId: string) {
    return this.mqttConfigService.getZonaMqttConfigsByConfig(configId);
  }

  @Get('zona/:zonaId/active')
  getActiveZonaMqttConfig(@Param('zonaId') zonaId: string) {
    return this.mqttConfigService.getActiveZonaMqttConfig(zonaId);
  }

  @Get('active-zona-mqtt-configs')
  getAllActiveZonaMqttConfigs() {
    return this.mqttConfigService.findActiveZonaMqttConfigs();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mqttConfigService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMqttConfigDto: UpdateMqttConfigDto,
  ) {
    const oldConfig = await this.mqttConfigService.findOne(id);
    const updatedConfig = await this.mqttConfigService.update(
      id,
      updateMqttConfigDto,
    );

    // Gestionar conexiones MQTT basadas en cambios de estado
    if (oldConfig?.activa && !updatedConfig.activa) {
      // Se desactivó la configuración
      await this.mqttService.removeConnection(id);
    } else if (!oldConfig?.activa && updatedConfig.activa) {
      // Se activó la configuración
      await this.mqttService.addConnection(updatedConfig);
    } else if (updatedConfig.activa) {
      // Se actualizó una configuración activa - refrescar conexión
      await this.mqttService.removeConnection(id);
      await this.mqttService.addConnection(updatedConfig);
    }

    return updatedConfig;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Remover conexión MQTT antes de eliminar la configuración
    await this.mqttService.removeConnection(id);
    return this.mqttConfigService.remove(id);
  }

  @Post('assign')
  async assignConfigToZona(@Body() body: { zonaId: string; configId: string }) {
    try {
      const result = await this.mqttConfigService.assignConfigToZona(
        body.zonaId,
        body.configId,
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Si la asignación está activa, crear conexión MQTT
      if (result.data?.estado) {
        await this.mqttService.addConnection(result.data);
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error assigning MQTT config to zona:', error);

      // Return validation errors as 400 Bad Request instead of 500 Internal Server Error
      if (
        error.message &&
        error.message.includes('Cannot assign configuration')
      ) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Post('unassign')
  async unassignConfigFromZona(
    @Body() body: { zonaId: string; configId: string },
  ) {
    // Remover conexión MQTT antes de desasignar
    const zonaMqttConfig = await this.mqttConfigService.getActiveZonaMqttConfig(
      body.zonaId,
    );
    if (zonaMqttConfig && zonaMqttConfig.mqttConfig?.id === body.configId) {
      await this.mqttService.removeConnection(zonaMqttConfig.id);
    }

    await this.mqttConfigService.unassignConfigFromZona(
      body.zonaId,
      body.configId,
    );
    return { success: true };
  }

  @Post('test-connection')
  async testConnection(
    @Body()
    testData: {
      host: string;
      port: string;
      protocol: string;
      topicBase: string;
    },
  ) {
    try {
      const startTime = Date.now();

      // Crear una conexión temporal para probar
      const brokerUrl = this.buildTestBrokerUrl(testData);
      const client = require('mqtt').connect(brokerUrl);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          client.end();
          resolve({
            success: false,
            message:
              'Timeout: No se recibió un mensaje JSON válido en 10 segundos',
            latency: null,
          });
        }, 10000);

        let messageReceived = false;

        client.on('connect', () => {
          const latency = Date.now() - startTime;
          console.log(`MQTT Test: Connected to ${brokerUrl} in ${latency}ms`);

          // Suscribirse al tópico para verificar permisos y recibir mensajes
          client.subscribe(testData.topicBase, (err: any) => {
            if (err) {
              client.end();
              resolve({
                success: false,
                message: `Conexión exitosa pero error al suscribirse: ${err.message}`,
                latency,
              });
            } else {
              console.log(`MQTT Test: Subscribed to ${testData.topicBase}`);
            }
          });
        });

        client.on('message', (topic: string, message: Buffer) => {
          if (messageReceived) return; // Solo procesar el primer mensaje
          messageReceived = true;

          const latency = Date.now() - startTime;
          clearTimeout(timeout);
          client.end();

          try {
            // Intentar parsear el mensaje como JSON
            const messageStr = message.toString();
            console.log(`MQTT Test: Received message on ${topic}:`, messageStr);

            JSON.parse(messageStr); // Validar que sea JSON válido

            resolve({
              success: true,
              message: `Conexión exitosa. Recibido mensaje JSON válido en tópico ${topic}`,
              latency,
            });
          } catch (parseError) {
            resolve({
              success: false,
              message: `Mensaje recibido pero no es JSON válido: ${message.toString().substring(0, 100)}...`,
              latency,
            });
          }
        });

        client.on('error', (error: any) => {
          clearTimeout(timeout);
          client.end();
          resolve({
            success: false,
            message: `Error de conexión: ${error.message}`,
            latency: null,
          });
        });
      });
    } catch (error: any) {
      return {
        success: false,
        message: `Error interno: ${error.message}`,
        latency: null,
      };
    }
  }

  private buildTestBrokerUrl(testData: {
    host: string;
    port: string;
    protocol: string;
  }): string {
    const protocol =
      testData.protocol === 'wss'
        ? 'wss'
        : testData.protocol === 'ws'
          ? 'ws'
          : 'mqtt';
    const port =
      testData.port ||
      (protocol === 'wss' ? '8884' : protocol === 'ws' ? '8883' : '1883');
    return `${protocol}://${testData.host}:${port}`;
  }

  /**
   * Obtener umbrales de una zona específica (usando la configuración activa)
   */
  @Get('zona/:zonaId/umbrales')
  async getUmbralesByZona(@Param('zonaId') zonaId: string) {
    try {
      return await this.mqttConfigService.getUmbralesByZona(zonaId);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Obtener umbrales de una configuración zona-mqtt específica
   */
  @Get('zona-mqtt/:id/umbrales')
  async getUmbrales(@Param('id') id: string) {
    try {
      return await this.mqttConfigService.getUmbrales(id);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Actualizar umbrales de una configuración zona-mqtt específica
   */
  @Put('zona-mqtt/:id/umbrales')
  async updateUmbrales(
    @Param('id') id: string,
    @Body() updateUmbralesDto: UpdateUmbralesDto,
  ) {
    try {
      return await this.mqttConfigService.updateUmbrales(id, updateUmbralesDto);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Validar si un valor excede los umbrales establecidos
   */
  @Post('zona-mqtt/:id/validate-threshold')
  async validateThreshold(
    @Param('id') id: string,
    @Body() validateThresholdDto: ValidateThresholdDto,
  ) {
    try {
      const { sensorType, value } = validateThresholdDto;
      return await this.mqttConfigService.validateThreshold(
        id,
        sensorType,
        value,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
