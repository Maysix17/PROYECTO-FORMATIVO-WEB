import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('categoria')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Permisos({
    recurso: 'inventario',
    acciones: ['crear'],
    moduloNombre: 'Inventario',
  })
  @Post()
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriaService.create(createCategoriaDto);
  }

  @Permisos({
    recurso: 'inventario',
    acciones: ['leer'],
    moduloNombre: 'Inventario',
  })
  @Get()
  findAll() {
    return this.categoriaService.findAll();
  }

  @Permisos({
    recurso: 'inventario',
    acciones: ['leer'],
    moduloNombre: 'Inventario',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriaService.findOne(id);
  }

  @Permisos({
    recurso: 'inventario',
    acciones: ['actualizar'],
    moduloNombre: 'Inventario',
  })
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
  ) {
    return this.categoriaService.update(id, updateCategoriaDto);
  }

  @Permisos({
    recurso: 'inventario',
    acciones: ['eliminar'],
    moduloNombre: 'Inventario',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriaService.remove(id);
  }
}
