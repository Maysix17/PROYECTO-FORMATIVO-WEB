import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { MqttConfig } from './entities/mqtt_config.entity';
import { ZonaMqttConfig } from './entities/zona_mqtt_config.entity';
import { CreateMqttConfigDto } from './dto/create-mqtt_config.dto';
import { UpdateMqttConfigDto } from './dto/update-mqtt_config.dto';
import { UpdateUmbralesDto } from './dto/update-umbrales.dto';
import {
  UmbralesResponseDto,
  UpdateUmbralesResponseDto,
} from './dto/umbrales-response.dto';
import { classToPlain } from 'class-transformer';

@Injectable()
export class MqttConfigService {
  constructor(
    @InjectRepository(MqttConfig)
    private readonly mqttConfigRepository: Repository<MqttConfig>,
    @InjectRepository(ZonaMqttConfig)
    private readonly zonaMqttConfigRepository: Repository<ZonaMqttConfig>,
  ) {}

  async create(createMqttConfigDto: CreateMqttConfigDto): Promise<MqttConfig> {
    const mqttConfig = this.mqttConfigRepository.create({
      ...createMqttConfigDto,
      port: parseInt(createMqttConfigDto.port, 10),
    });
    return await this.mqttConfigRepository.save(mqttConfig);
  }

  async findAll(): Promise<MqttConfig[]> {
    return await this.mqttConfigRepository.find({
      relations: ['zonaMqttConfigs', 'zonaMqttConfigs.zona'],
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<MqttConfig | null> {
    return await this.mqttConfigRepository.findOne({
      where: { id },
      relations: ['zonaMqttConfigs', 'zonaMqttConfigs.zona'],
    });
  }

  async findByZona(zonaId: string): Promise<ZonaMqttConfig | null> {
    return await this.zonaMqttConfigRepository.findOne({
      where: { fkZonaId: zonaId, estado: true },
      relations: ['mqttConfig', 'zona'],
    });
  }

  async findActive(): Promise<MqttConfig[]> {
    return await this.mqttConfigRepository.find({
      where: { activa: true },
      relations: ['zonaMqttConfigs', 'zonaMqttConfigs.zona'],
    });
  }

  async findActiveZonaMqttConfigs(): Promise<ZonaMqttConfig[]> {
    return await this.zonaMqttConfigRepository.find({
      where: { estado: true },
      relations: ['mqttConfig', 'zona'],
      select: [
        'id',
        'fkZonaId',
        'fkMqttConfigId',
        'estado',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async update(
    id: string,
    updateMqttConfigDto: UpdateMqttConfigDto,
  ): Promise<MqttConfig> {
    const updateData: any = { ...updateMqttConfigDto };
    if (updateMqttConfigDto.port) {
      updateData.port = parseInt(updateMqttConfigDto.port, 10);
    }
    await this.mqttConfigRepository.update(id, updateData);
    const result = await this.findOne(id);
    if (!result) throw new Error('Configuración no encontrada');
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.mqttConfigRepository.delete(id);
  }

  // ZonaMqttConfig methods
  async assignConfigToZona(
    zonaId: string,
    configId: string,
  ): Promise<{
    success: boolean;
    data?: ZonaMqttConfig;
    error?: { configName: string; zonaName: string };
  }> {
    // Check if this config is already actively assigned to another zona
    const activeAssignment = await this.zonaMqttConfigRepository.findOne({
      where: {
        fkMqttConfigId: configId,
        estado: true,
        fkZonaId: Not(zonaId), // Not the current zona
      },
      relations: ['zona', 'mqttConfig'],
    });

    if (activeAssignment) {
      const configName =
        activeAssignment.mqttConfig?.nombre || 'Unknown Configuration';
      const zonaName = activeAssignment.zona?.nombre || 'Unknown Zone';
      return { success: false, error: { configName, zonaName } };
    }

    // Check if this config is already assigned to this zona (even if inactive)
    const existingAssignment = await this.zonaMqttConfigRepository.findOne({
      where: { fkZonaId: zonaId, fkMqttConfigId: configId },
    });

    if (existingAssignment) {
      if (existingAssignment.estado) {
        // Already active, no need to do anything
        return { success: true, data: existingAssignment };
      } else {
        // Reactivate the existing assignment
        await this.zonaMqttConfigRepository.update(existingAssignment.id, {
          estado: true,
        });
        const result = await this.zonaMqttConfigRepository.findOne({
          where: { id: existingAssignment.id },
          relations: ['mqttConfig', 'zona'],
        });
        return { success: true, data: result || undefined };
      }
    }

    // Create new assignment
    const zonaMqttConfig = this.zonaMqttConfigRepository.create({
      fkZonaId: zonaId,
      fkMqttConfigId: configId,
      estado: true,
    });

    const saved = await this.zonaMqttConfigRepository.save(zonaMqttConfig);

    // Load relations for the MQTT service
    const result = await this.zonaMqttConfigRepository.findOne({
      where: { id: saved.id },
      relations: ['mqttConfig', 'zona'],
    });

    if (!result) {
      throw new Error('Failed to load assigned configuration with relations');
    }

    return { success: true, data: result };
  }

  async unassignConfigFromZona(
    zonaId: string,
    configId: string,
  ): Promise<void> {
    await this.zonaMqttConfigRepository.update(
      { fkZonaId: zonaId, fkMqttConfigId: configId },
      { estado: false },
    );
  }

  async getZonaMqttConfigs(zonaId: string): Promise<ZonaMqttConfig[]> {
    return await this.zonaMqttConfigRepository.find({
      where: { fkZonaId: zonaId, estado: true },
      relations: ['mqttConfig', 'zona'],
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveZonaMqttConfig(
    zonaId: string,
  ): Promise<ZonaMqttConfig | null> {
    return await this.zonaMqttConfigRepository.findOne({
      where: { fkZonaId: zonaId, estado: true },
      relations: ['mqttConfig', 'zona'],
    });
  }

  async getZonaMqttConfigsByConfig(
    configId: string,
  ): Promise<ZonaMqttConfig[]> {
    return await this.zonaMqttConfigRepository.find({
      where: { fkMqttConfigId: configId },
      relations: ['mqttConfig', 'zona'],
      order: { createdAt: 'DESC' },
    });
  }

  async isZonaMqttConfigActive(id: string): Promise<boolean> {
    const zmc = await this.zonaMqttConfigRepository.findOne({ where: { id } });
    return !!(zmc && zmc.estado);
  }

  /**
   * Obtener umbrales de una zona específica (usando la configuración activa)
   */
  async getUmbralesByZona(zonaId: string): Promise<UmbralesResponseDto> {
    const zonaMqttConfig = await this.zonaMqttConfigRepository.findOne({
      where: { fkZonaId: zonaId, estado: true },
      relations: ['mqttConfig', 'zona'],
    });

    if (!zonaMqttConfig || !zonaMqttConfig.mqttConfig) {
      throw new NotFoundException(
        `No se encontró configuración activa para la zona con ID ${zonaId}`,
      );
    }

    const mqttConfig = zonaMqttConfig.mqttConfig;

    // Transformar los umbrales a formato DTO
    const umbrales: Record<string, any> = {};
    if (mqttConfig.umbrales) {
      Object.entries(mqttConfig.umbrales).forEach(([key, value]) => {
        umbrales[key] = {
          minimo: value.minimo,
          maximo: value.maximo,
        };
      });
    }

    return {
      id: zonaMqttConfig.id,
      fkZonaMqttConfigId: zonaMqttConfig.id,
      umbrales,
      estado: zonaMqttConfig.estado,
      createdAt: zonaMqttConfig.createdAt,
      updatedAt: zonaMqttConfig.updatedAt,
      zonaNombre: zonaMqttConfig.zona?.nombre,
      mqttConfigNombre: mqttConfig.nombre,
      mqttConfigHost: mqttConfig.host,
      mqttConfigPort: mqttConfig.port,
    };
  }

  /**
   * Obtener umbrales de una configuración MQTT específica
   */
  async getUmbrales(mqttConfigId: string): Promise<UmbralesResponseDto> {
    const mqttConfig = await this.mqttConfigRepository.findOne({
      where: { id: mqttConfigId },
      relations: ['zonaMqttConfigs', 'zonaMqttConfigs.zona'],
    });

    if (!mqttConfig) {
      throw new NotFoundException(
        `Configuración MQTT con ID ${mqttConfigId} no encontrada`,
      );
    }

    // Transformar los umbrales a formato DTO
    const umbrales: Record<string, any> = {};
    if (mqttConfig.umbrales) {
      Object.entries(mqttConfig.umbrales).forEach(([key, value]) => {
        umbrales[key] = {
          minimo: value.minimo,
          maximo: value.maximo,
        };
      });
    }

    // Get the first active zona for display purposes
    const activeZona = mqttConfig.zonaMqttConfigs?.find(
      (zmc) => zmc.estado,
    )?.zona;

    return {
      id: mqttConfig.id,
      fkZonaMqttConfigId: mqttConfig.id, // For compatibility
      umbrales,
      estado: mqttConfig.activa,
      createdAt: mqttConfig.zonaMqttConfigs?.[0]?.createdAt || new Date(),
      updatedAt: mqttConfig.zonaMqttConfigs?.[0]?.updatedAt || new Date(),
      zonaNombre: activeZona?.nombre || 'Sin zona activa',
      mqttConfigNombre: mqttConfig.nombre,
      mqttConfigHost: mqttConfig.host,
      mqttConfigPort: mqttConfig.port,
    };
  }

  /**
   * Actualizar umbrales de una configuración MQTT específica
   */
  async updateUmbrales(
    mqttConfigId: string,
    updateUmbralesDto: UpdateUmbralesDto,
  ): Promise<UpdateUmbralesResponseDto> {
    const mqttConfig = await this.mqttConfigRepository.findOne({
      where: { id: mqttConfigId },
      relations: ['zonaMqttConfigs', 'zonaMqttConfigs.zona'],
    });

    if (!mqttConfig) {
      throw new NotFoundException(
        `Configuración MQTT con ID ${mqttConfigId} no encontrada`,
      );
    }

    // Actualizar los umbrales
    await this.mqttConfigRepository.update(mqttConfigId, {
      umbrales: updateUmbralesDto.umbrales,
    });

    // Obtener la configuración actualizada
    const updatedConfig = await this.getUmbrales(mqttConfigId);

    return {
      success: true,
      message: 'Umbrales actualizados exitosamente',
      data: updatedConfig,
      timestamp: new Date(),
    };
  }

  /**
   * Validar si un valor excede los umbrales establecidos
   */
  async getSensorsForMqttConfig(mqttConfigId: string): Promise<string[]> {
    // Find only ACTIVE zonaMqttConfigs for this mqttConfig
    const zonaMqttConfigs = await this.zonaMqttConfigRepository.find({
      where: { fkMqttConfigId: mqttConfigId, estado: true },
      relations: ['mediciones'],
    });

    // Collect unique sensor keys from all measurements
    const sensorKeys = new Set<string>();
    zonaMqttConfigs.forEach((zmc) => {
      zmc.mediciones?.forEach((medicion) => {
        sensorKeys.add(medicion.key);
      });
    });

    return Array.from(sensorKeys).sort();
  }

  async validateThreshold(
    mqttConfigId: string,
    sensorType: string,
    value: number,
  ): Promise<{
    exceeds: boolean;
    threshold?: { minimo: number; maximo: number };
    message: string;
  }> {
    const mqttConfig = await this.mqttConfigRepository.findOne({
      where: { id: mqttConfigId },
    });

    if (!mqttConfig) {
      throw new NotFoundException(
        `Configuración MQTT con ID ${mqttConfigId} no encontrada`,
      );
    }

    const umbrales = mqttConfig.umbrales || {};
    const threshold = umbrales[sensorType];

    if (!threshold) {
      return {
        exceeds: false,
        message: `No hay umbrales definidos para el tipo de sensor: ${sensorType}`,
      };
    }

    const exceeds = value < threshold.minimo || value > threshold.maximo;
    const message = exceeds
      ? `El valor ${value} está fuera del rango permitido [${threshold.minimo}, ${threshold.maximo}]`
      : `El valor ${value} está dentro del rango permitido [${threshold.minimo}, ${threshold.maximo}]`;

    return {
      exceeds,
      threshold,
      message,
    };
  }
}
