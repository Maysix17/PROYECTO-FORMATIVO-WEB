import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { CultivosVariedadXZonaService } from './cultivos_variedad_x_zona.service';
import { CreateCultivosVariedadXZonaDto } from './dto/create-cultivos_variedad_x_zona.dto';
import { UpdateCultivosVariedadXZonaDto } from './dto/update-cultivos_variedad_x_zona.dto';
import { UpdateCantidadPlantasDto } from './dto/update-cantidad-plantas.dto';
import { UpdateEstadoFenologicoDto } from './dto/update-estado-fenologico.dto';

@Controller('cultivos-variedad-x-zona')
export class CultivosVariedadXZonaController {
  constructor(
    private readonly cultivosVariedadXZonaService: CultivosVariedadXZonaService,
  ) {}

  @Post()
  create(
    @Body() createCultivosVariedadXZonaDto: CreateCultivosVariedadXZonaDto,
  ) {
    return this.cultivosVariedadXZonaService.create(
      createCultivosVariedadXZonaDto,
    );
  }

  @Get()
  findAll() {
    return this.cultivosVariedadXZonaService.findAll();
  }

  @Get('cultivo/:cultivoId')
  findByCultivo(@Param('cultivoId') cultivoId: string) {
    return this.cultivosVariedadXZonaService.findByCultivo(cultivoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log(`[DEBUG] Controller findOne called with id: ${id}`);
    return this.cultivosVariedadXZonaService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCultivosVariedadXZonaDto: UpdateCultivosVariedadXZonaDto,
  ) {
    return this.cultivosVariedadXZonaService.update(
      id,
      updateCultivosVariedadXZonaDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cultivosVariedadXZonaService.remove(id);
  }

  // Nuevos endpoints para características del cultivo
  @Post(':id/cantidad-plantas')
  actualizarCantidadPlantas(
    @Param('id') id: string,
    @Body() dto: UpdateCantidadPlantasDto,
  ) {
    return this.cultivosVariedadXZonaService.actualizarCantidadPlantas(id, dto);
  }

  @Put(':id/estado-fenologico')
  actualizarEstadoFenologico(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoFenologicoDto,
  ) {
    return this.cultivosVariedadXZonaService.actualizarEstadoFenologico(
      id,
      dto.fk_estado_fenologico,
    );
  }

  @Get(':id/edad')
  calcularEdadCultivo(@Param('id') id: string) {
    return this.cultivosVariedadXZonaService.calcularEdadCultivo(id);
  }

  @Get(':id/detalles-cultivo')
  getCropDetails(@Param('id') id: string) {
    console.log(`[DEBUG] Controller getCropDetails called with id: ${id}`);
    return this.cultivosVariedadXZonaService.getCropDetails(id);
  }
}
