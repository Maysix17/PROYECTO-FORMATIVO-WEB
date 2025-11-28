import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductosService } from './productos.service';
import { CreateProductosDto } from './dto/create-productos.dto';
import { UpdateProductosDto } from './dto/update-productos.dto';
import { CreateProductoWithLoteDto } from './dto/create-producto-with-lote.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('productos')
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  @Post()
  create(@Body() createProductosDto: CreateProductosDto) {
    return this.productosService.create(createProductosDto);
  }

  @Get()
  findAll() {
    return this.productosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthenticationGuard)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateProductosDto: UpdateProductosDto,
  ) {
    // Load user from database using userId from guard
    const usuario = await this.usuarioRepository.findOne({
      where: { id: req.userId },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    const userDni = usuario.dni;
    return this.productosService.update(id, updateProductosDto, userDni);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }

  @Post('with-lote')
  @UseGuards(AuthenticationGuard)
  async createWithLote(
    @Req() req: any,
    @Body() createProductoWithLoteDto: CreateProductoWithLoteDto,
  ) {
    // Load user from database using userId from guard
    const usuario = await this.usuarioRepository.findOne({
      where: { id: req.userId },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    const userDni = usuario.dni;
    return this.productosService.createWithLote(
      createProductoWithLoteDto,
      userDni,
    );
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('imgUrl', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `imgUrl-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/${file.filename}` };
  }
}
