import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CultivosVariedadXZonaService } from './cultivos_variedad_x_zona.service';
import { CreateCultivosVariedadXZonaDto } from './dto/create-cultivos_variedad_x_zona.dto';
import { UpdateCultivosVariedadXZonaDto } from './dto/update-cultivos_variedad_x_zona.dto';
import { UpdateCantidadPlantasDto } from './dto/update-cantidad-plantas.dto';
import { UpdateEstadoFenologicoDto } from './dto/update-estado-fenologico.dto';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('cultivos-variedad-x-zona')
export class CultivosVariedadXZonaController {
  constructor(
    private readonly cultivosVariedadXZonaService: CultivosVariedadXZonaService,
  ) {}

  @Permisos({
    recurso: 'zonas',
    acciones: ['crear'],
    moduloNombre: 'Zonas',
  })
  @Post()
  create(
    @Body() createCultivosVariedadXZonaDto: CreateCultivosVariedadXZonaDto,
  ) {
    return this.cultivosVariedadXZonaService.create(
      createCultivosVariedadXZonaDto,
    );
  }

  @Permisos({
    recurso: 'zonas',
    acciones: ['leer'],
    moduloNombre: 'Zonas',
  })
  @Get()
  findAll() {
    return this.cultivosVariedadXZonaService.findAll();
  }

  @Permisos({
    recurso: 'zonas',
    acciones: ['leer'],
    moduloNombre: 'Zonas',
  })
  @Get('cultivo/:cultivoId')
  findByCultivo(@Param('cultivoId') cultivoId: string) {
    return this.cultivosVariedadXZonaService.findByCultivo(cultivoId);
  }

  @Permisos({
    recurso: 'zonas',
    acciones: ['leer'],
    moduloNombre: 'Zonas',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log(`[DEBUG] Controller findOne called with id: ${id}`);
    return this.cultivosVariedadXZonaService.findOne(id);
  }

  @Permisos({
    recurso: 'zonas',
    acciones: ['actualizar'],
    moduloNombre: 'Zonas',
  })
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

  @Permisos({
    recurso: 'zonas',
    acciones: ['eliminar'],
    moduloNombre: 'Zonas',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cultivosVariedadXZonaService.remove(id);
  }

  // Nuevos endpoints para características del cultivo
  @Permisos({
    recurso: 'zonas',
    acciones: ['actualizar'],
    moduloNombre: 'Zonas',

  },
{    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Post(':id/cantidad-plantas')
  actualizarCantidadPlantas(
    @Param('id') id: string,
    @Body() dto: UpdateCantidadPlantasDto,
  ) {
    return this.cultivosVariedadXZonaService.actualizarCantidadPlantas(id, dto);
  }

  @Permisos({
    recurso: 'zonas',
    acciones: ['actualizar'],
    moduloNombre: 'Zonas',  
  },
  {
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
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

  @Permisos({
    recurso: 'zonas',
    acciones: ['leer'],
    moduloNombre: 'Zonas',
  })
  @Get(':id/edad')
  calcularEdadCultivo(@Param('id') id: string) {
    return this.cultivosVariedadXZonaService.calcularEdadCultivo(id);
  }

  @Permisos({
    recurso: 'zonas',
    acciones: ['leer'],
    moduloNombre: 'Zonas',
  })
  @Get(':id/detalles-cultivo')
  getCropDetails(@Param('id') id: string) {
    console.log(`[DEBUG] Controller getCropDetails called with id: ${id}`);
    return this.cultivosVariedadXZonaService.getCropDetails(id);
  }
}
