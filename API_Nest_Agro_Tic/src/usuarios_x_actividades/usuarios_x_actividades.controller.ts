import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsuariosXActividadesService } from './usuarios_x_actividades.service';
import { CreateUsuariosXActividadeDto } from './dto/create-usuarios_x_actividade.dto';
import { UpdateUsuariosXActividadeDto } from './dto/update-usuarios_x_actividade.dto';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';

@Controller('usuarios-x-actividades')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class UsuariosXActividadesController {
  constructor(
    private readonly usuariosXActividadesService: UsuariosXActividadesService,
  ) {}

  @Permisos({
    recurso: 'actividades',
    acciones: ['crear'],
    moduloNombre: 'Actividades',
  })
  @Post()
  create(@Body() createUsuariosXActividadeDto: CreateUsuariosXActividadeDto) {
    return this.usuariosXActividadesService.create(
      createUsuariosXActividadeDto,
    );
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get()
  findAll(@Request() req: any) {
    const userId = req.userId;
    return this.usuariosXActividadesService.findByUser(userId);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get('actividad/:actividadId')
  findByActividad(@Param('actividadId') actividadId: string) {
    return this.usuariosXActividadesService.findByActividad(actividadId);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosXActividadesService.findOne(id);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUsuariosXActividadeDto: UpdateUsuariosXActividadeDto,
  ) {
    return this.usuariosXActividadesService.update(
      id,
      updateUsuariosXActividadeDto,
    );
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['eliminar'],
    moduloNombre: 'Actividades',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosXActividadesService.remove(id);
  }
}
