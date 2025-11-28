import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicionSensor } from './entities/medicion_sensor.entity';
import { ZonaMqttConfig } from '../mqtt_config/entities/zona_mqtt_config.entity';
import { CreateMedicionSensorDto } from './dto/create-medicion_sensor.dto';
import { UpdateMedicionSensorDto } from './dto/update-medicion_sensor.dto';
import {
  SensorSearchResponseDto,
  CultivoZonaSensorDto,
  SensorConfigDto,
  UniqueSensorDataDto,
} from './dto/sensor-search-response.dto';
import {
  HistoricalSensorDataResponseDto,
  HistoricalSensorDataPointDto,
  SensorAverageDto,
} from './dto/historical-sensor-data.dto';
import { ReportDataRequestDto } from './dto/report-data-request.dto';
import {
  ReportDataResponseDto,
  SensorStatisticsDto,
} from './dto/report-data-response.dto';
import { CultivosZonasResponseDto } from './dto/cultivos-zonas-response.dto';

@Injectable()
export class MedicionSensorService {
  constructor(
    @InjectRepository(MedicionSensor)
    private readonly medicionSensorRepository: Repository<MedicionSensor>,
    @InjectRepository(ZonaMqttConfig)
    private readonly zonaMqttConfigRepository: Repository<ZonaMqttConfig>,
  ) {}

  async create(
    createMedicionSensorDto: CreateMedicionSensorDto,
  ): Promise<MedicionSensor> {
    const medicion = this.medicionSensorRepository.create(
      createMedicionSensorDto,
    );
    return await this.medicionSensorRepository.save(medicion);
  }

  async findAll(): Promise<MedicionSensor[]> {
    return await this.medicionSensorRepository
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.zonaMqttConfig', 'zmc')
      .innerJoinAndSelect('zmc.mqttConfig', 'mc')
      .innerJoinAndSelect('zmc.zona', 'z')
      .where('zmc.estado = :estado', { estado: true })
      .orderBy('ms.fechaMedicion', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<MedicionSensor | null> {
    return await this.medicionSensorRepository.findOne({
      where: { id },
      relations: [
        'zonaMqttConfig',
        'zonaMqttConfig.mqttConfig',
        'zonaMqttConfig.zona',
      ],
    });
  }

  async findByZona(zonaId: string): Promise<MedicionSensor[]> {
    return await this.medicionSensorRepository
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.zonaMqttConfig', 'zmc')
      .innerJoinAndSelect('zmc.mqttConfig', 'mc')
      .innerJoinAndSelect('zmc.zona', 'z')
      .where('zmc.fkZonaId = :zonaId', { zonaId })
      .andWhere('zmc.estado = :estado', { estado: true })
      .orderBy('ms.fechaMedicion', 'DESC')
      .getMany();
  }

  async findByMqttConfig(mqttConfigId: string): Promise<MedicionSensor[]> {
    return await this.medicionSensorRepository
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.zonaMqttConfig', 'zmc')
      .innerJoinAndSelect('zmc.mqttConfig', 'mc')
      .innerJoinAndSelect('zmc.zona', 'z')
      .where('zmc.fkMqttConfigId = :mqttConfigId', { mqttConfigId })
      .andWhere('zmc.estado = :estado', { estado: true })
      .orderBy('ms.fechaMedicion', 'DESC')
      .getMany();
  }

  async findRecentByZona(
    zonaId: string,
    limit: number = 50,
  ): Promise<MedicionSensor[]> {
    return await this.medicionSensorRepository
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.zonaMqttConfig', 'zmc')
      .innerJoinAndSelect('zmc.mqttConfig', 'mc')
      .innerJoinAndSelect('zmc.zona', 'z')
      .where('zmc.fkZonaId = :zonaId', { zonaId })
      .andWhere('zmc.estado = :estado', { estado: true })
      .orderBy('ms.fechaMedicion', 'DESC')
      .take(limit)
      .getMany();
  }

  async update(
    id: string,
    updateMedicionSensorDto: UpdateMedicionSensorDto,
  ): Promise<MedicionSensor> {
    await this.medicionSensorRepository.update(id, updateMedicionSensorDto);
    const result = await this.findOne(id);
    if (!result) throw new Error('Medición no encontrada');
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.medicionSensorRepository.delete(id);
  }

  async saveBatch(
    mediciones: CreateMedicionSensorDto[],
  ): Promise<MedicionSensor[]> {
    const entities = this.medicionSensorRepository.create(mediciones);
    return await this.medicionSensorRepository.save(entities);
  }

  async getSensorSearchData(): Promise<SensorSearchResponseDto> {
    // First get all zona-mqtt configs with their zones (including inactive for historical data)
    const zonaMqttConfigs = await this.zonaMqttConfigRepository
      .createQueryBuilder('zmc')
      .innerJoinAndSelect('zmc.mqttConfig', 'mc')
      .innerJoinAndSelect('zmc.zona', 'z')
      .leftJoinAndSelect('z.cultivosVariedad', 'cvz')
      .leftJoinAndSelect('cvz.cultivoXVariedad', 'cxv')
      .leftJoinAndSelect('cxv.variedad', 'v')
      .leftJoinAndSelect('v.tipoCultivo', 'tc')
      .getMany();

    // Group by unique cultivo-zona combinations
    const groupedData = new Map<string, CultivoZonaSensorDto>();

    for (const zmc of zonaMqttConfigs) {
      const zona = zmc.zona;
      const mqttConfig = zmc.mqttConfig;

      if (!zona || !mqttConfig) continue;

      // Get measurements for this zona-mqtt config
      const measurements = await this.medicionSensorRepository
        .createQueryBuilder('ms')
        .where('ms.fkZonaMqttConfigId = :zmcId', { zmcId: zmc.id })
        .orderBy('ms.fechaMedicion', 'DESC')
        .getMany();

      if (!zona.cultivosVariedad || zona.cultivosVariedad.length === 0)
        continue;

      zona.cultivosVariedad.forEach((cvz) => {
        const cxv = cvz.cultivoXVariedad;
        const variedad = cxv?.variedad;
        const tipoCultivo = variedad?.tipoCultivo;

        if (!cxv || !variedad || !tipoCultivo) return;

        const key = `${cxv.id}-${zona.id}`;

        if (!groupedData.has(key)) {
          groupedData.set(key, {
            cultivoId: cxv.id,
            cultivoNombre: tipoCultivo.nombre,
            variedadNombre: variedad.nombre,
            tipoCultivoNombre: tipoCultivo.nombre,
            zonaId: zona.id,
            zonaNombre: zona.nombre,
            cvzId: cvz.id,
            sensorConfig: {
              id: mqttConfig.id,
              nombre: mqttConfig.nombre,
              host: mqttConfig.host,
              port: mqttConfig.port,
              protocol: mqttConfig.protocol,
              topicBase: mqttConfig.topicBase,
            },
            uniqueSensorData: [],
          });
        }

        // Add unique sensor data (avoid duplicates by key)
        const existingData = groupedData.get(key)!.uniqueSensorData;
        const existingKeys = new Set(existingData.map((d) => d.key));

        measurements.forEach((measurement) => {
          if (!existingKeys.has(measurement.key)) {
            existingData.push({
              key: measurement.key,
              unidad: measurement.unidad,
              valor: measurement.valor,
              fechaMedicion: measurement.fechaMedicion,
            });
            existingKeys.add(measurement.key);
          }
        });
      });
    }

    return {
      results: Array.from(groupedData.values()),
    };
  }

  async getHistoricalSensorData(
    sensorKeys: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<HistoricalSensorDataResponseDto> {
    // Get all measurements for the selected sensor keys with related data
    let query = this.medicionSensorRepository
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.zonaMqttConfig', 'zmc')
      .innerJoinAndSelect('zmc.zona', 'z')
      .leftJoinAndSelect('z.cultivosVariedad', 'cvz')
      .leftJoinAndSelect('cvz.cultivoXVariedad', 'cxv')
      .leftJoinAndSelect('cxv.variedad', 'v')
      .leftJoinAndSelect('v.tipoCultivo', 'tc')
      .where('ms.key IN (:...sensorKeys)', { sensorKeys });

    // Add date filters if provided
    if (startDate) {
      query = query.andWhere('ms.fechaMedicion >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      query = query.andWhere('ms.fechaMedicion <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const measurements = await query
      .orderBy('ms.fechaMedicion', 'ASC')
      .getMany();

    // Process data points
    const dataPoints: HistoricalSensorDataPointDto[] = measurements.map(
      (measurement) => {
        const zona = measurement.zonaMqttConfig?.zona;
        const cultivosVariedad = zona?.cultivosVariedad || [];
        const firstCultivo = cultivosVariedad[0];

        let cultivoNombre = 'Sin cultivo';
        let variedadNombre = 'Sin variedad';

        if (firstCultivo?.cultivoXVariedad?.variedad?.tipoCultivo) {
          cultivoNombre =
            firstCultivo.cultivoXVariedad.variedad.tipoCultivo.nombre;
          variedadNombre = firstCultivo.cultivoXVariedad.variedad.nombre;
        }

        return {
          timestamp: measurement.fechaMedicion.toISOString(),
          sensorKey: measurement.key,
          value: measurement.valor,
          unidad: measurement.unidad,
          cultivoNombre,
          zonaNombre: zona?.nombre || 'Sin zona',
          variedadNombre,
        };
      },
    );

    // Calculate averages
    const sensorGroups = dataPoints.reduce(
      (acc, point) => {
        if (!acc[point.sensorKey]) {
          acc[point.sensorKey] = { values: [], unidad: point.unidad };
        }
        acc[point.sensorKey].values.push(point.value);
        return acc;
      },
      {} as Record<string, { values: number[]; unidad: string }>,
    );

    const averages: SensorAverageDto[] = Object.entries(sensorGroups).map(
      ([sensorKey, data]) => ({
        sensorKey,
        average:
          data.values.reduce((sum, val) => sum + val, 0) / data.values.length,
        count: data.values.length,
        unidad: data.unidad,
      }),
    );

    // Get date range
    const timestamps = dataPoints.map((p) => new Date(p.timestamp));
    const start =
      timestamps.length > 0
        ? new Date(
            Math.min(...timestamps.map((t) => t.getTime())),
          ).toISOString()
        : '';
    const end =
      timestamps.length > 0
        ? new Date(
            Math.max(...timestamps.map((t) => t.getTime())),
          ).toISOString()
        : '';

    return {
      dataPoints,
      averages,
      dateRange: { start, end },
    };
  }

  async getReportData(
    request: ReportDataRequestDto,
  ): Promise<ReportDataResponseDto[]> {
    const {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      group_by = 'daily',
    } = request;

    // Build the query with joins
    let query = this.medicionSensorRepository
      .createQueryBuilder('ms')
      .innerJoin('ms.zonaMqttConfig', 'zmc')
      .innerJoin('zmc.zona', 'z')
      .leftJoin('z.cultivosVariedad', 'cvz')
      .leftJoin('cvz.cultivoXVariedad', 'cxv')
      .leftJoin('cxv.variedad', 'v')
      .leftJoin('v.tipoCultivo', 'tc');

    // Only filter by med_keys if provided and not empty
    if (med_keys && med_keys.length > 0) {
      query = query.andWhere('ms.key IN (:...med_keys)', { med_keys });
    }

    // Add optional filters
    if (cultivo_ids && cultivo_ids.length > 0) {
      query = query.andWhere('cxv.id IN (:...cultivo_ids)', { cultivo_ids });
    }

    if (zona_ids && zona_ids.length > 0) {
      query = query.andWhere('z.id IN (:...zona_ids)', { zona_ids });
    }

    // Add date filters
    if (start_date) {
      query = query.andWhere('ms.fechaMedicion >= :start_date', {
        start_date: new Date(start_date),
      });
    }

    if (end_date) {
      query = query.andWhere('ms.fechaMedicion <= :end_date', {
        end_date: new Date(end_date),
      });
    }

    // Determine date format for grouping
    let dateFormat: string;
    switch (group_by) {
      case 'hourly':
        dateFormat = "TO_CHAR(ms.fechaMedicion, 'YYYY-MM-DD HH24:00:00')";
        break;
      case 'weekly':
        dateFormat =
          "TO_CHAR(DATE_TRUNC('week', ms.fechaMedicion), 'YYYY-MM-DD')";
        break;
      case 'daily':
      default:
        dateFormat = "TO_CHAR(ms.fechaMedicion, 'YYYY-MM-DD')";
        break;
    }

    // Execute the query with aggregations
    const rawResults = await query
      .select([
        'cxv.id as cultivoId',
        'tc.nombre as cultivoNombre',
        'v.nombre as variedadNombre',
        'z.id as zonaId',
        'z.nombre as zonaNombre',
        'cvz.id as cvzId',
        `${dateFormat} as period`,
        'ms.key as med_key',
        'COUNT(ms.valor) as count',
        'MIN(ms.valor) as min',
        'MAX(ms.valor) as max',
        'AVG(ms.valor) as avg',
        'SUM(ms.valor) as sum',
        'STDDEV(ms.valor) as stddev',
      ])
      .groupBy('cxv.id')
      .addGroupBy('tc.nombre')
      .addGroupBy('v.nombre')
      .addGroupBy('z.id')
      .addGroupBy('z.nombre')
      .addGroupBy('cvz.id')
      .addGroupBy(`${dateFormat}`)
      .addGroupBy('ms.key')
      .orderBy('cxv.id')
      .addOrderBy('z.id')
      .addOrderBy('period')
      .addOrderBy('ms.key')
      .getRawMany();

    // Process results into the required format
    const groupedData = new Map<string, ReportDataResponseDto>();

    for (const row of rawResults) {
      const key = `${row.cultivoid}-${row.zonaid}-${row.period}`;

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          cultivoId: row.cultivoid,
          cultivoNombre: row.cultivonombre,
          variedadNombre: row.variedadnombre,
          zonaId: row.zonaid,
          zonaNombre: row.zonanombre,
          cvzId: row.cvzid,
          period: row.period,
          statistics: [],
        });
      }

      const stats: SensorStatisticsDto = {
        med_key: row.med_key,
        count: parseInt(row.count),
        min: parseFloat(row.min),
        max: parseFloat(row.max),
        avg: parseFloat(row.avg),
        sum: parseFloat(row.sum),
        stddev: row.stddev ? parseFloat(row.stddev) : 0,
      };

      groupedData.get(key)!.statistics.push(stats);
    }

    return Array.from(groupedData.values());
  }

  async getCultivosZonas(): Promise<CultivosZonasResponseDto[]> {
    // Query zona_mqtt_config with inner joins to ensure only combinations with sensor measurements exist
    const rawResults = await this.zonaMqttConfigRepository
      .createQueryBuilder('zmc')
      .innerJoin('zmc.mediciones', 'ms') // Inner join to medicion_sensor to ensure data exists
      .innerJoin('zmc.zona', 'z')
      .innerJoin('z.cultivosVariedad', 'cvz')
      .innerJoin('cvz.cultivoXVariedad', 'cxv')
      .innerJoin('cxv.variedad', 'v')
      .innerJoin('v.tipoCultivo', 'tc')
      .innerJoin('cxv.cultivo', 'c')
      .select([
        'cxv.id as cultivoId',
        'tc.nombre as cultivoNombre',
        'v.nombre as variedadNombre',
        'tc.nombre as tipoCultivoNombre',
        'z.id as zonaId',
        'z.nombre as zonaNombre',
        'cvz.id as cvzId',
        'c.estado as estadoCultivo',
        'c.siembra as fechaSiembra',
      ])
      .distinct(true) // Ensure unique combinations
      .orderBy('tc.nombre', 'ASC')
      .addOrderBy('z.nombre', 'ASC')
      .getRawMany();

    // Map raw results to DTO
    return rawResults.map((row) => ({
      cultivoId: row.cultivoid,
      cultivoNombre: row.cultivonombre,
      variedadNombre: row.variedadnombre,
      tipoCultivoNombre: row.tipocultivonombre,
      zonaId: row.zonaid,
      zonaNombre: row.zonanombre,
      cvzId: row.cvzid,
      estadoCultivo: row.estadocultivo,
      fechaSiembra: row.fechasiembra,
    }));
  }
}
