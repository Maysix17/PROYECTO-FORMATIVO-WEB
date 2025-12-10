import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReservasXActividadService } from './reservas_x_actividad.service';
import { CreateReservasXActividadDto } from './dto/create-reservas_x_actividad.dto';
import { UpdateReservasXActividadDto } from './dto/update-reservas_x_actividad.dto';
import { FinalizeActivityDto } from './dto/finalize-activity.dto';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('reservas-x-actividad')
export class ReservasXActividadController {
  constructor(
    private readonly reservasXActividadService: ReservasXActividadService,
  ) {}

  @Permisos({
    recurso: 'actividades',
    acciones: ['crear'],
    moduloNombre: 'Actividades',
  })
  @Post()
  create(@Body() createReservasXActividadDto: CreateReservasXActividadDto) {
    return this.reservasXActividadService.create(createReservasXActividadDto);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  },
{
    recurso: 'cultivos',
    acciones: ['leer'],
    moduloNombre: 'Cultivos',
  })
  @Get()
  findAll() {
    return this.reservasXActividadService.findAll();
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  },
{
    recurso: 'cultivos',
    acciones: ['leer'],
    moduloNombre: 'Cultivos',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservasXActividadService.findOne(id);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReservasXActividadDto: UpdateReservasXActividadDto,
  ) {
    return this.reservasXActividadService.update(
      id,
      updateReservasXActividadDto,
    );
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Post('finalize')
  @UseInterceptors(FileInterceptor('imgUrl'))
  finalizeActivity(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('🔍 CONTROLLER: Raw body received:', body);
    console.log(
      '🔍 CONTROLLER: Received file:',
      file ? { originalname: file.originalname, size: file.size } : 'No file',
    );

    // Parse JSON fields from FormData
    const finalizeActivityDto: FinalizeActivityDto = {
      actividadId: body.actividadId,
      reservas: JSON.parse(body.reservas),
      horas: parseFloat(body.horas),
      precioHora: parseFloat(body.precioHora),
      observacion: body.observacion,
      imgUrl: body.imgUrl,
    };

    console.log(
      '🔍 CONTROLLER: Parsed finalizeActivityDto:',
      finalizeActivityDto,
    );
    return this.reservasXActividadService.finalizeActivity(
      finalizeActivityDto,
      file,
    );
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['eliminar'],
    moduloNombre: 'Actividades',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservasXActividadService.remove(id);
  }
}
