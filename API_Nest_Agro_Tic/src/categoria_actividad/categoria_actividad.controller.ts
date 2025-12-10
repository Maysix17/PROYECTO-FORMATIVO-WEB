import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import { CategoriaActividadService } from './categoria_actividad.service';
import { CreateCategoriaActividadDto } from './dto/create-categoria_actividad.dto';
import { UpdateCategoriaActividadDto } from './dto/update-categoria_actividad.dto';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('categoria-actividad')
export class CategoriaActividadController {
  constructor(
    private readonly categoriaActividadService: CategoriaActividadService,
  ) {}

  @Permisos(
    {
      recurso: 'cultivos',
      acciones: ['crear'],
      moduloNombre: 'Cultivos',
    },
    {
      recurso: 'actividades',
      acciones: ['crear'],
      moduloNombre: 'Actividades',
    }
  )
  @Post()
  create(@Body() createCategoriaActividadDto: CreateCategoriaActividadDto) {
    return this.categoriaActividadService.create(createCategoriaActividadDto);
  }

  @Permisos(
    {
      recurso: 'cultivos',
      acciones: ['leer'],
      moduloNombre: 'Cultivos',
    },
    {
      recurso: 'actividades',
      acciones: ['leer'],
      moduloNombre: 'Actividades',
    }
  )
  @Get()
  findAll() {
    return this.categoriaActividadService.findAll();
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['leer'],
    moduloNombre: 'Cultivos',
  })
  @Get('search/:query')
  search(
    @Param('query') query: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.categoriaActividadService.search(query, page, limit);
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['leer'],
    moduloNombre: 'Cultivos',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriaActividadService.findOne(id);
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['actualizar'],
    moduloNombre: 'Cultivos',
  },
{
    recurso: 'actividades',
    acciones: ['eliminar'],
    moduloNombre: 'Actividades',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoriaActividadDto: UpdateCategoriaActividadDto,
  ) {
    return this.categoriaActividadService.update(
      id,
      updateCategoriaActividadDto,
    );
  }

  @Permisos({
    recurso: 'cultivos',
    acciones: ['eliminar'],
    moduloNombre: 'Cultivos',
  },
{
    recurso: 'actividades',
    acciones: ['eliminar'],
    moduloNombre: 'Actividades',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriaActividadService.remove(id);
  }
}
