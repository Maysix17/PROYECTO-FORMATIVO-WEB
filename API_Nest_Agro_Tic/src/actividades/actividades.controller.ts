import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ActividadesService } from './actividades.service';
import { CreateActividadeDto } from './dto/create-actividade.dto';
import { UpdateActividadeDto } from './dto/update-actividade.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('actividades')
export class ActividadesController {
  constructor(
    private readonly actividadesService: ActividadesService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  @Post()
  @UseGuards(AuthenticationGuard)
  @UseInterceptors(
    FileInterceptor('imgUrl', {
      storage: diskStorage({
        destination: './uploads/actividades',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async create(
    @Req() req: any,
    @Body() dto: CreateActividadeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log(
      'ActividadesController create - dto.fechaAsignacion:',
      dto.fechaAsignacion,
    );
    console.log(
      'ActividadesController create - dto.fechaAsignacion type:',
      typeof dto.fechaAsignacion,
    );
    console.log(
      'ActividadesController create - dto.fechaAsignacion ISO:',
      dto.fechaAsignacion.toISOString(),
    );

    const imgUrl = file ? `/uploads/actividades/${file.filename}` : '';
    // Load user from database using userId from guard
    const usuario = await this.usuarioRepository.findOne({
      where: { id: req.userId },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    const dniResponsable = usuario.dni;
    return this.actividadesService.create({ ...dto, imgUrl }, dniResponsable);
  }

  @Get()
  findAll() {
    return this.actividadesService.findAll();
  }

  @Get('count-by-date/:date')
  countByDate(@Param('date') date: string) {
    return this.actividadesService.countByDate(date);
  }

  @Get('by-date/:date')
  findByDate(@Param('date') date: string) {
    return this.actividadesService.findByDate(date);
  }

  @Get('by-date-active/:date')
  findByDateWithActive(@Param('date') date: string) {
    return this.actividadesService.findByDateWithActive(date);
  }

  @Get('by-date-range')
  findByDateRange(@Query('start') start: string, @Query('end') end: string) {
    return this.actividadesService.findByDateRange(start, end);
  }

  @Get('by-cultivo-variedad-zona/:cvzId')
  findByCultivoVariedadZonaId(@Param('cvzId') cvzId: string) {
    return this.actividadesService.findByCultivoVariedadZonaId(cvzId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actividadesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActividadeDto) {
    return this.actividadesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actividadesService.remove(id);
  }

  @Patch(':id/finalizar')
  @UseGuards(AuthenticationGuard)
  @UseInterceptors(
    FileInterceptor('imgUrl', {
      storage: diskStorage({
        destination: './uploads/evidencias',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async finalizar(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { observacion?: string; horas?: number; precioHora?: number },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imgUrl = file ? `/uploads/evidencias/${file.filename}` : undefined;
    console.log(
      `[${new Date().toISOString()}] 📡 CONTROLLER: Finalizing activity ${id} - Generated image URL: ${imgUrl || 'No image'}`,
    );
    console.log(
      `[${new Date().toISOString()}] 📡 CONTROLLER: File details:`,
      file
        ? {
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
          }
        : 'No file',
    );
    // Load user from database using userId from guard
    const usuario = await this.usuarioRepository.findOne({
      where: { id: req.userId },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    const userDni = usuario.dni;
    return this.actividadesService.finalizar(
      id,
      body.observacion,
      imgUrl,
      body.horas,
      body.precioHora,
      userDni,
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/evidencias',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/evidencias/${file.filename}` };
  }

  // New endpoints for reservation management

  @Post(':id/reservas')
  createReservation(
    @Param('id') actividadId: string,
    @Body()
    body: { loteId: string; cantidadReservada: number; estadoId?: number },
  ) {
    return this.actividadesService.createReservation(
      actividadId,
      body.loteId,
      body.cantidadReservada,
      body.estadoId,
    );
  }

  @Post(':id/reservas/producto')
  createReservationByProduct(
    @Param('id') actividadId: string,
    @Body()
    body: { productId: string; cantidadReservada: number; estadoId?: number },
  ) {
    return this.actividadesService.createReservationByProduct(
      actividadId,
      body.productId,
      body.cantidadReservada,
      body.estadoId,
    );
  }

  @Patch('reservas/:reservaId/confirm-usage')
  confirmUsage(
    @Param('reservaId') reservaId: string,
    @Body() body: { cantidadUsada: number },
  ) {
    return this.actividadesService.confirmUsage(reservaId, body.cantidadUsada);
  }

  @Get(':id/cost')
  calculateCost(@Param('id') actividadId: string) {
    return this.actividadesService.calculateCost(actividadId);
  }

  @Get(':id/reservas')
  getReservationsByActivity(@Param('id') actividadId: string) {
    return this.actividadesService.getReservationsByActivity(actividadId);
  }
}
