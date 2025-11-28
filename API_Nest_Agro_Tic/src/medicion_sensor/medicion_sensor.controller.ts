import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { MedicionSensorService } from './medicion_sensor.service';
import { CreateMedicionSensorDto } from './dto/create-medicion_sensor.dto';
import { UpdateMedicionSensorDto } from './dto/update-medicion_sensor.dto';
import { SensorSearchResponseDto } from './dto/sensor-search-response.dto';
import { HistoricalSensorDataResponseDto } from './dto/historical-sensor-data.dto';
import { ReportDataRequestDto } from './dto/report-data-request.dto';
import { ReportDataResponseDto } from './dto/report-data-response.dto';
import { CultivosZonasResponseDto } from './dto/cultivos-zonas-response.dto';

@Controller('medicion-sensor')
export class MedicionSensorController {
  constructor(private readonly medicionSensorService: MedicionSensorService) {}

  @Post()
  create(@Body() createMedicionSensorDto: CreateMedicionSensorDto) {
    return this.medicionSensorService.create(createMedicionSensorDto);
  }

  @Post('batch')
  createBatch(@Body() createMedicionSensorDtos: CreateMedicionSensorDto[]) {
    return this.medicionSensorService.saveBatch(createMedicionSensorDtos);
  }

  @Get()
  findAll() {
    return this.medicionSensorService.findAll();
  }

  @Get('zona/:zonaId')
  findByZona(@Param('zonaId') zonaId: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.medicionSensorService.findRecentByZona(zonaId, limitNum);
  }

  @Get('mqtt-config/:mqttConfigId')
  findByMqttConfig(@Param('mqttConfigId') mqttConfigId: string) {
    return this.medicionSensorService.findByMqttConfig(mqttConfigId);
  }

  @Get('sensor-search')
  getSensorSearchData(): Promise<SensorSearchResponseDto> {
    return this.medicionSensorService.getSensorSearchData();
  }

  @Post('historical-data')
  getHistoricalSensorData(
    @Body() body: { sensorKeys: string[]; startDate?: string; endDate?: string },
  ): Promise<HistoricalSensorDataResponseDto> {
    const { sensorKeys, startDate, endDate } = body;
    return this.medicionSensorService.getHistoricalSensorData(
      sensorKeys || [],
      startDate,
      endDate,
    );
  }

  @Post('report-data')
  getReportData(
    @Body() request: ReportDataRequestDto,
  ): Promise<ReportDataResponseDto[]> {
    return this.medicionSensorService.getReportData(request);
  }

  @Get('by-cultivos-zonas')
  getCultivosZonas(): Promise<CultivosZonasResponseDto[]> {
    return this.medicionSensorService.getCultivosZonas();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicionSensorService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMedicionSensorDto: UpdateMedicionSensorDto,
  ) {
    return this.medicionSensorService.update(id, updateMedicionSensorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicionSensorService.remove(id);
  }
}
