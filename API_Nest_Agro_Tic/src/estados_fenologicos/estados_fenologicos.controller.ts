import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { EstadosFenologicosService } from './estados_fenologicos.service';
import { EstadoFenologico } from './entities/estado_fenologico.entity';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('estados-fenologicos')
export class EstadosFenologicosController {
  constructor(private readonly estadosService: EstadosFenologicosService) {}

  @Permisos({
    recurso: 'cultivos',
    acciones: ['crear'],
    moduloNombre: 'Cultivos',
  })
  @Post()
  async create(
    @Body()
    createEstadoDto: {
      nombre: string;
      descripcion?: string;
      orden: number;
    },
  ) {
    return await this.estadosService.create(createEstadoDto);
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['leer'],
    moduloNombre: 'Cultivos',
  })
  @Get()
  async findAll(): Promise<EstadoFenologico[]> {
    return await this.estadosService.findAll();
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['leer'],
    moduloNombre: 'Cultivos',
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EstadoFenologico> {
    return await this.estadosService.findOne(+id);
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['actualizar'],
    moduloNombre: 'Cultivos',
  },
  {
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    updateEstadoDto: Partial<{
      nombre: string;
      descripcion?: string;
      orden: number;
    }>,
  ) {
    return await this.estadosService.update(+id, updateEstadoDto);
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['eliminar'],
    moduloNombre: 'Cultivos',
  })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.estadosService.remove(+id);
  }
}
