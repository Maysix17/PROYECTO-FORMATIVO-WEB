import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { LotesInventarioService } from './lotes_inventario.service';
import { CreateLotesInventarioDto } from './dto/create-lotes_inventario.dto';
import { UpdateLotesInventarioDto } from './dto/update-lotes_inventario.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('inventario')
export class LotesInventarioController {
  constructor(
    private readonly lotesInventarioService: LotesInventarioService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  @Post()
  create(@Body() createLotesInventarioDto: CreateLotesInventarioDto) {
    return this.lotesInventarioService.create(createLotesInventarioDto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.lotesInventarioService.findAllPaginated(pageNum, limitNum);
  }

  @Get('search/:query')
  search(
    @Param('query') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.lotesInventarioService.search(query, pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lotesInventarioService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthenticationGuard)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateLotesInventarioDto: UpdateLotesInventarioDto,
  ) {
    // Load user from database using userId from guard
    const usuario = await this.usuarioRepository.findOne({
      where: { id: req.userId },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    const userDni = usuario.dni;
    console.log('Controller: update called with userDni from DB:', userDni);
    return this.lotesInventarioService.update(
      id,
      updateLotesInventarioDto,
      userDni,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lotesInventarioService.remove(id);
  }

  @Get('available-products')
  getAvailableProducts() {
    return this.lotesInventarioService.getAvailableProducts();
  }
}
