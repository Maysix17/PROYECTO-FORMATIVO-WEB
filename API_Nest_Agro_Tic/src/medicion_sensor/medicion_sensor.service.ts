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
import {
  CsvExportResponseDto,
  CsvSensorDataPointDto,
} from './dto/csv-export-response.dto';
import { CultivosZonasResponseDto } from './dto/cultivos-zonas-response.dto';
import {
  SensorAlertsResponseDto,
  SensorAlertDto,
} from './dto/sensor-alerts-response.dto';
import {
  RawChartDataResponseDto,
  RawSensorDataPointDto,
} from './dto/raw-chart-data-response.dto';

@Injectable()
export class MedicionSensorService {
  constructor(
    @InjectRepository(MedicionSensor)
    private readonly medicionSensorRepository: Repository<MedicionSensor>,
    @InjectRepository(ZonaMqttConfig)
    private readonly zonaMqttConfigRepository: Repository<ZonaMqttConfig>,
  ) {}

  /**
   * Adjusts a date string to Bogotá timezone (UTC-5)
   * @param dateString Date in YYYY-MM-DD format
   * @param isEndDate If true, sets to end of day (23:59:59), otherwise start of day (00:00:00)
   * @returns Date object adjusted to UTC equivalent of Bogotá time
   */
  private adjustToBogotaTime(
    dateString: string,
    isEndDate: boolean = false,
  ): Date {
    // Create date in Bogotá timezone
    const bogotaDate = new Date(
      dateString + (isEndDate ? 'T23:59:59-05:00' : 'T00:00:00-05:00'),
    );
    return bogotaDate;
  }

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

    // Add date filters if provided (adjusted to Bogotá timezone)
    if (startDate) {
      query = query.andWhere('ms.fechaMedicion >= :startDate', {
        startDate: this.adjustToBogotaTime(startDate, false),
      });
    }

    if (endDate) {
      query = query.andWhere('ms.fechaMedicion <= :endDate', {
        endDate: this.adjustToBogotaTime(endDate, true),
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
      time_range,
      time_ranges,
    } = request;

    console.log('=== REPORT DATA REQUEST ===');
    console.log('Fecha y hora actual:', new Date().toISOString());
    console.log('Parámetros recibidos:', {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      group_by,
      time_range,
      time_ranges,
    });

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

    // Add date filters (adjusted to Bogotá timezone)
    if (start_date) {
      query = query.andWhere('ms.fechaMedicion >= :start_date', {
        start_date: this.adjustToBogotaTime(start_date, false),
      });
    }

    if (end_date) {
      query = query.andWhere('ms.fechaMedicion <= :end_date', {
        end_date: this.adjustToBogotaTime(end_date, true),
      });
    }

    // Add time range filter (adjusted to Bogotá timezone)
    if (time_ranges && time_ranges.length > 0) {
      const hourConditions: string[] = [];
      const hourParams: any = {};

      time_ranges.forEach((range, index) => {
        let hourStart: number, hourEnd: number;
        switch (range) {
          case 'morning':
            hourStart = 6;
            hourEnd = 12;
            break;
          case 'afternoon':
            hourStart = 12;
            hourEnd = 18;
            break;
          case 'evening':
            hourStart = 18;
            hourEnd = 24;
            break;
          case 'night':
            hourStart = 0;
            hourEnd = 6;
            break;
          default:
            hourStart = 0;
            hourEnd = 24;
        }
        hourConditions.push(
          `((EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart${index} AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd${index})`,
        );
        hourParams[`hourStart${index}`] = hourStart;
        hourParams[`hourEnd${index}`] = hourEnd;
      });

      query = query.andWhere(`(${hourConditions.join(' OR ')})`, hourParams);
      console.log(
        `Filtro de rangos horarios aplicado (Bogotá time): ${time_ranges.join(', ')}`,
      );
    } else if (time_range) {
      // Backward compatibility
      let hourStart: number, hourEnd: number;
      switch (time_range) {
        case 'morning':
          hourStart = 6;
          hourEnd = 12;
          break;
        case 'afternoon':
          hourStart = 12;
          hourEnd = 18;
          break;
        case 'evening':
          hourStart = 18;
          hourEnd = 24;
          break;
        case 'night':
          hourStart = 0;
          hourEnd = 6;
          break;
        default:
          hourStart = 0;
          hourEnd = 24;
      }
      query = query.andWhere(
        '(EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd',
        {
          hourStart,
          hourEnd,
        },
      );
      console.log(
        `Filtro de rango horario aplicado (legacy, Bogotá time): ${hourStart}:00 - ${hourEnd}:00`,
      );
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
      case 'time_slot':
        dateFormat =
          "TO_CHAR(ms.fechaMedicion, 'YYYY-MM-DD') || '-' || CASE WHEN (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < 6 THEN '0' WHEN (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < 12 THEN '1' WHEN (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < 18 THEN '2' ELSE '3' END";
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

      let timeSlot: number | undefined;
      if (group_by === 'time_slot') {
        const parts = row.period.split('-');
        timeSlot = parseInt(parts[parts.length - 1]);
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          cultivoId: row.cultivoid,
          cultivoNombre: row.cultivonombre,
          variedadNombre: row.variedadnombre,
          zonaId: row.zonaid,
          zonaNombre: row.zonanombre,
          cvzId: row.cvzid,
          period: row.period,
          timeSlot,
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

    const result = Array.from(groupedData.values());
    console.log(`Total de registros procesados: ${rawResults.length}`);
    console.log(`Total de grupos de reporte generados: ${result.length}`);
    console.log('Primeros 3 resultados:', result.slice(0, 3));
    console.log('=== FIN REPORT DATA REQUEST ===\n');
    return result;
  }

  async getCsvExportData(
    request: ReportDataRequestDto,
  ): Promise<CsvExportResponseDto> {
    const {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      time_ranges,
      time_range,
    } = request;

    console.log('=== CSV EXPORT DATA REQUEST ===');
    console.log('Fecha y hora actual:', new Date().toISOString());
    console.log('Parámetros recibidos:', {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      time_ranges,
      time_range,
    });

    // Build the query with joins (similar to getReportData but without aggregation)
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

    // Add date filters (adjusted to Bogotá timezone)
    if (start_date) {
      query = query.andWhere('ms.fechaMedicion >= :start_date', {
        start_date: this.adjustToBogotaTime(start_date, false),
      });
    }

    if (end_date) {
      query = query.andWhere('ms.fechaMedicion <= :end_date', {
        end_date: this.adjustToBogotaTime(end_date, true),
      });
    }

    // Add time range filter (adjusted to Bogotá timezone)
    if (time_ranges && time_ranges.length > 0) {
      const hourConditions: string[] = [];
      const hourParams: any = {};

      time_ranges.forEach((range, index) => {
        let hourStart: number, hourEnd: number;
        switch (range) {
          case 'morning':
            hourStart = 6;
            hourEnd = 12;
            break;
          case 'afternoon':
            hourStart = 12;
            hourEnd = 18;
            break;
          case 'evening':
            hourStart = 18;
            hourEnd = 24;
            break;
          case 'night':
            hourStart = 0;
            hourEnd = 6;
            break;
          default:
            hourStart = 0;
            hourEnd = 24;
        }
        hourConditions.push(
          `((EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart${index} AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd${index})`,
        );
        hourParams[`hourStart${index}`] = hourStart;
        hourParams[`hourEnd${index}`] = hourEnd;
      });

      query = query.andWhere(`(${hourConditions.join(' OR ')})`, hourParams);
      console.log(
        `Filtro de rangos horarios aplicado (Bogotá time): ${time_ranges.join(', ')}`,
      );
    } else if (time_range) {
      // Backward compatibility
      let hourStart: number, hourEnd: number;
      switch (time_range) {
        case 'morning':
          hourStart = 6;
          hourEnd = 12;
          break;
        case 'afternoon':
          hourStart = 12;
          hourEnd = 18;
          break;
        case 'evening':
          hourStart = 18;
          hourEnd = 24;
          break;
        case 'night':
          hourStart = 0;
          hourEnd = 6;
          break;
        default:
          hourStart = 0;
          hourEnd = 24;
      }
      query = query.andWhere(
        '(EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd',
        {
          hourStart,
          hourEnd,
        },
      );
      console.log(
        `Filtro de rango horario aplicado (legacy, Bogotá time): ${hourStart}:00 - ${hourEnd}:00`,
      );
    }

    // Execute the query to get raw measurements
    const measurements = await query
      .select([
        'ms.fechaMedicion as fechaMedicion',
        'ms.key as sensorKey',
        'ms.valor as value',
        'ms.unidad as unit',
        'tc.nombre as cropTypeName',
        'v.nombre as varietyName',
        'z.nombre as zoneName',
        'cxv.id as cultivoId',
      ])
      .orderBy('ms.fechaMedicion', 'ASC')
      .getRawMany();

    // Convert timestamps to Bogotá timezone (UTC-5) and format data
    const data: CsvSensorDataPointDto[] = measurements.map((measurement) => {
      // Convert UTC timestamp to Bogotá time (UTC-5)
      const utcDate = new Date(measurement.fechamedicion);
      const bogotaDate = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000); // Subtract 5 hours

      // Format timestamp as ISO string but in Bogotá timezone
      const timestamp = bogotaDate.toISOString().replace('Z', '-05:00');

      return {
        timestamp,
        sensor_id: measurement.sensorkey,
        value: parseFloat(measurement.value),
        unit: measurement.unit,
        crop_name: measurement.croptypename || 'Sin tipo de cultivo',
        zone_name: measurement.zonename || 'Sin zona',
        variety_name: measurement.varietyname || 'Sin variedad',
        crop_type_name: measurement.croptypename || 'Sin tipo de cultivo',
      };
    });

    console.log(`Total de registros CSV procesados: ${measurements.length}`);
    console.log('Primeros 3 registros:', data.slice(0, 3));
    console.log('=== FIN CSV EXPORT DATA REQUEST ===\n');

    return {
      data,
      totalRecords: data.length,
    };
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

  async getSensorAlerts(
    request: ReportDataRequestDto,
  ): Promise<SensorAlertsResponseDto> {
    const {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      group_by = 'daily',
      time_range,
      time_ranges,
    } = request;

    console.log('=== SENSOR ALERTS REQUEST ===');
    console.log('Fecha y hora actual:', new Date().toISOString());
    console.log('Parámetros recibidos:', {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      group_by,
      time_range,
      time_ranges,
    });

    try {
      // Build the query with joins - only get alert-type measurements
      let query = this.medicionSensorRepository
        .createQueryBuilder('ms')
        .innerJoin('ms.zonaMqttConfig', 'zmc')
        .innerJoin('zmc.mqttConfig', 'mc')
        .innerJoin('zmc.zona', 'z')
        .leftJoin('z.cultivosVariedad', 'cvz')
        .leftJoin('cvz.cultivoXVariedad', 'cxv')
        .leftJoin('cxv.variedad', 'v')
        .leftJoin('v.tipoCultivo', 'tc')
        .where('ms.tipo = :tipo', { tipo: 'alerta' }); // Only alert measurements

      console.log('Query builder created successfully');

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

      // Add date filters (adjusted to Bogotá timezone)
      if (start_date) {
        query = query.andWhere('ms.fechaMedicion >= :start_date', {
          start_date: this.adjustToBogotaTime(start_date, false),
        });
      }

      if (end_date) {
        query = query.andWhere('ms.fechaMedicion <= :end_date', {
          end_date: this.adjustToBogotaTime(end_date, true),
        });
      }

      // Add time range filter (adjusted to Bogotá timezone)
      if (time_ranges && time_ranges.length > 0) {
        const hourConditions: string[] = [];
        const hourParams: any = {};

        time_ranges.forEach((range, index) => {
          let hourStart: number, hourEnd: number;
          switch (range) {
            case 'morning':
              hourStart = 6;
              hourEnd = 12;
              break;
            case 'afternoon':
              hourStart = 12;
              hourEnd = 18;
              break;
            case 'evening':
              hourStart = 18;
              hourEnd = 24;
              break;
            case 'night':
              hourStart = 0;
              hourEnd = 6;
              break;
            default:
              hourStart = 0;
              hourEnd = 24;
          }
          hourConditions.push(
            `((EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart${index} AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd${index})`,
          );
          hourParams[`hourStart${index}`] = hourStart;
          hourParams[`hourEnd${index}`] = hourEnd;
        });

        query = query.andWhere(`(${hourConditions.join(' OR ')})`, hourParams);
        console.log(
          `Filtro de rangos horarios aplicado (Bogotá time): ${time_ranges.join(', ')}`,
        );
      } else if (time_range) {
        // Backward compatibility
        let hourStart: number, hourEnd: number;
        switch (time_range) {
          case 'morning':
            hourStart = 6;
            hourEnd = 12;
            break;
          case 'afternoon':
            hourStart = 12;
            hourEnd = 18;
            break;
          case 'evening':
            hourStart = 18;
            hourEnd = 24;
            break;
          case 'night':
            hourStart = 0;
            hourEnd = 6;
            break;
          default:
            hourStart = 0;
            hourEnd = 24;
        }
        query = query.andWhere(
          '(EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd',
          {
            hourStart,
            hourEnd,
          },
        );
        console.log(
          `Filtro de rango horario aplicado (legacy, Bogotá time): ${hourStart}:00 - ${hourEnd}:00`,
        );
      }

      // Get all alert measurements (simplified approach - all tipo='alerta' are alerts)
      console.log('Executing query for alert measurements...');
      const measurements = await query
        .select([
          'ms.fechaMedicion as fechaMedicion',
          'ms.key as sensorKey',
          'ms.valor as value',
          'ms.unidad as unit',
          'mc.umbrales as thresholds',
          'tc.nombre as cropTypeName',
          'v.nombre as varietyName',
          'z.nombre as zoneName',
        ])
        .orderBy('ms.fechaMedicion', 'ASC')
        .getRawMany();

      console.log(
        `Query executed successfully. Found ${measurements.length} alert measurements`,
      );

      // Process alerts - simplified for most sensors, specific logic for HumedadSuelo
      const alerts: SensorAlertDto[] = [];
      console.log('Processing measurements for alerts...');

      for (const measurement of measurements) {
        const sensorKey = measurement.sensorkey;
        const value = parseFloat(measurement.value);
        const unit = measurement.unit || '';

        let descripcion = '';
        let umbralSobrepasado: 'máximo' | 'mínimo' = 'máximo';

        // Parse thresholds and determine which threshold was breached
        try {
          const thresholds = measurement.thresholds || {};
          const sensorThresholds = thresholds[sensorKey];

          if (sensorThresholds && typeof sensorThresholds === 'object') {
            const { minimo, maximo } = sensorThresholds;
            if (value > maximo) {
              umbralSobrepasado = 'máximo';
            } else if (value < minimo) {
              umbralSobrepasado = 'mínimo';
            }
            // If value is between min and max, default to 'máximo' (shouldn't happen for alerts)
          }
        } catch (error) {
          console.warn(
            `Error parsing thresholds for sensor ${sensorKey}:`,
            error,
          );
          // Keep default 'máximo'
        }

        // Special logic for HumedadSuelo sensor
        if (sensorKey === 'HumedadSuelo') {
          // For HumedadSuelo, determine message based on umbralSobrepasado
          if (umbralSobrepasado === 'máximo') {
            descripcion = `Bomba de agua desactivada - Humedad alta detectada (${value} ${unit})`;
          } else if (umbralSobrepasado === 'mínimo') {
            descripcion = `Bomba de agua activada - Humedad baja detectada (${value} ${unit})`;
          } else {
            // Fallback for any other case
            descripcion = `Alerta: Humedad del suelo requiere atención (${value} ${unit})`;
          }
        } else {
          // Simplified logic for other sensors
          switch (sensorKey) {
            case 'Gas':
              descripcion = `Alerta: Nivel de gas anormal detectado (${value} ${unit})`;
              break;
            case 'Luz':
              descripcion = `Alerta: Intensidad de luz fuera de rango (${value} ${unit})`;
              break;
            case 'Humedad':
              descripcion = `Alerta: Nivel de humedad anormal (${value} ${unit})`;
              break;
            case 'Temperatura':
              descripcion = `Alerta: Temperatura fuera de rango óptimo (${value} ${unit})`;
              break;
            default:
              descripcion = `Alerta: Sensor ${sensorKey} reportó valor crítico (${value} ${unit})`;
          }
        }

        alerts.push({
          fechaMedicion: measurement.fechamedicion.toISOString(),
          sensor: sensorKey,
          valorMedido: value,
          umbralSobrepasado,
          descripcion,
          zonaNombre: measurement.zonename || 'Sin zona',
          cultivoNombre: measurement.croptypename || 'Sin cultivo',
          variedadNombre: measurement.varietyname || 'Sin variedad',
        });
      }

      console.log(`Total de alertas encontradas: ${alerts.length}`);
      console.log('Primeras 3 alertas:', alerts.slice(0, 3));
      console.log('=== FIN SENSOR ALERTS REQUEST ===\n');

      return {
        alerts,
        totalAlerts: alerts.length,
      };
    } catch (error) {
      console.error('Error in getSensorAlerts:', error);
      throw error;
    }
  }

  async getRawChartData(
    request: ReportDataRequestDto,
  ): Promise<RawChartDataResponseDto> {
    const {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      time_ranges,
      time_range,
    } = request;

    console.log('=== RAW CHART DATA REQUEST ===');
    console.log('Fecha y hora actual:', new Date().toISOString());
    console.log('Parámetros recibidos:', {
      med_keys,
      cultivo_ids,
      zona_ids,
      start_date,
      end_date,
      time_ranges,
      time_range,
    });

    // Build the query with joins (similar to getReportData but without aggregation)
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

    // Add date filters (adjusted to Bogotá timezone)
    if (start_date) {
      query = query.andWhere('ms.fechaMedicion >= :start_date', {
        start_date: this.adjustToBogotaTime(start_date, false),
      });
    }

    if (end_date) {
      query = query.andWhere('ms.fechaMedicion <= :end_date', {
        end_date: this.adjustToBogotaTime(end_date, true),
      });
    }

    // Add time range filter (adjusted to Bogotá timezone)
    if (time_ranges && time_ranges.length > 0) {
      const hourConditions: string[] = [];
      const hourParams: any = {};

      time_ranges.forEach((range, index) => {
        let hourStart: number, hourEnd: number;
        switch (range) {
          case 'morning':
            hourStart = 6;
            hourEnd = 12;
            break;
          case 'afternoon':
            hourStart = 12;
            hourEnd = 18;
            break;
          case 'evening':
            hourStart = 18;
            hourEnd = 24;
            break;
          case 'night':
            hourStart = 0;
            hourEnd = 6;
            break;
          default:
            hourStart = 0;
            hourEnd = 24;
        }
        hourConditions.push(
          `((EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart${index} AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd${index})`,
        );
        hourParams[`hourStart${index}`] = hourStart;
        hourParams[`hourEnd${index}`] = hourEnd;
      });

      query = query.andWhere(`(${hourConditions.join(' OR ')})`, hourParams);
      console.log(
        `Filtro de rangos horarios aplicado (Bogotá time): ${time_ranges.join(', ')}`,
      );
    } else if (time_range) {
      // Backward compatibility
      let hourStart: number, hourEnd: number;
      switch (time_range) {
        case 'morning':
          hourStart = 6;
          hourEnd = 12;
          break;
        case 'afternoon':
          hourStart = 12;
          hourEnd = 18;
          break;
        case 'evening':
          hourStart = 18;
          hourEnd = 24;
          break;
        case 'night':
          hourStart = 0;
          hourEnd = 6;
          break;
        default:
          hourStart = 0;
          hourEnd = 24;
      }
      query = query.andWhere(
        '(EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 >= :hourStart AND (EXTRACT(hour from ms.fechaMedicion) - 5 + 24) % 24 < :hourEnd',
        {
          hourStart,
          hourEnd,
        },
      );
      console.log(
        `Filtro de rango horario aplicado (legacy, Bogotá time): ${hourStart}:00 - ${hourEnd}:00`,
      );
    }

    // Execute the query to get raw measurements
    const measurements = await query
      .select([
        'ms.fechaMedicion as fechaMedicion',
        'ms.key as sensorKey',
        'ms.valor as value',
        'ms.unidad as unit',
        'tc.nombre as cropTypeName',
        'v.nombre as varietyName',
        'z.nombre as zoneName',
        'cxv.id as cultivoId',
      ])
      .orderBy('ms.fechaMedicion', 'ASC')
      .getRawMany();

    // Convert timestamps to Bogotá timezone and format data
    const dataPoints: RawSensorDataPointDto[] = measurements.map(
      (measurement) => {
        // Convert UTC timestamp to Bogotá time (UTC-5)
        const utcDate = new Date(measurement.fechamedicion);
        const bogotaDate = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000); // Subtract 5 hours

        return {
          timestamp: bogotaDate.toISOString(),
          sensorKey: measurement.sensorkey,
          value: parseFloat(measurement.value),
          unidad: measurement.unit || '',
          zonaNombre: measurement.zonename || 'Sin zona',
          cultivoNombre: measurement.croptypename || 'Sin cultivo',
          variedadNombre: measurement.varietyname || 'Sin variedad',
        };
      },
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

    console.log(
      `Total de puntos de datos crudos procesados: ${measurements.length}`,
    );
    console.log('Primeros 3 puntos:', dataPoints.slice(0, 3));
    console.log('=== FIN RAW CHART DATA REQUEST ===\n');

    return {
      dataPoints,
      totalPoints: dataPoints.length,
      dateRange: { start, end },
    };
  }
}
