import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EstadosFenologicosService } from './estados_fenologicos.service';
import { EstadoFenologico } from './entities/estado_fenologico.entity';

@Controller('estados-fenologicos')
export class EstadosFenologicosController {
  constructor(private readonly estadosService: EstadosFenologicosService) {}

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

  @Get()
  async findAll(): Promise<EstadoFenologico[]> {
    return await this.estadosService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EstadoFenologico> {
    return await this.estadosService.findOne(+id);
  }

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

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.estadosService.remove(+id);
  }
}
