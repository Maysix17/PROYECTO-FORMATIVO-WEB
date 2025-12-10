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
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ActividadesService } from './actividades.service';
import { CreateActividadeDto } from './dto/create-actividade.dto';
import { UpdateActividadeDto } from './dto/update-actividade.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('actividades')
export class ActividadesController {
  constructor(
    private readonly actividadesService: ActividadesService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  @Permisos({
    recurso: 'actividades',
    acciones: ['crear'],
    moduloNombre: 'Actividades',
  })
  @Post()
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

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get()
  findAll() {
    return this.actividadesService.findAll();
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get('count-by-date/:date')
  countByDate(@Param('date') date: string) {
    return this.actividadesService.countByDate(date);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get('by-date/:date')
  findByDate(@Param('date') date: string) {
    return this.actividadesService.findByDate(date);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get('by-date-active/:date')
  findByDateWithActive(@Param('date') date: string) {
    return this.actividadesService.findByDateWithActive(date);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get('by-date-range')
  findByDateRange(@Query('start') start: string, @Query('end') end: string) {
    return this.actividadesService.findByDateRange(start, end);
  }

  @Get('by-cultivo-variedad-zona/:cvzId')
  findByCultivoVariedadZonaId(@Param('cvzId') cvzId: string) {
    return this.actividadesService.findByCultivoVariedadZonaId(cvzId);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actividadesService.findOne(id);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActividadeDto) {
    return this.actividadesService.update(id, dto);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['eliminar'],
    moduloNombre: 'Actividades',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actividadesService.remove(id);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['eliminar'],
    moduloNombre: 'Actividades',
  })
  @Delete(':id/with-validation')
  removeWithValidation(@Req() req: any, @Param('id') id: string) {
    const userDni = req.user?.dni;
    return this.actividadesService.removeWithValidation(id, userDni);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Patch(':id/finalizar')
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

  @Permisos({
    recurso: 'actividades',
    acciones: ['crear'],
    moduloNombre: 'Actividades',
  })
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

  @Permisos({
    recurso: 'actividades',
    acciones: ['crear'],
    moduloNombre: 'Actividades',
  })
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

  @Permisos({
    recurso: 'actividades',
    acciones: ['crear'],
    moduloNombre: 'Actividades',
  })
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

  @Permisos({
    recurso: 'actividades',
    acciones: ['actualizar'],
    moduloNombre: 'Actividades',
  })
  @Patch('reservas/:reservaId/confirm-usage')
  confirmUsage(
    @Param('reservaId') reservaId: string,
    @Body() body: { cantidadUsada: number },
  ) {
    return this.actividadesService.confirmUsage(reservaId, body.cantidadUsada);
  }

  @Permisos({
    recurso: 'actividades',
    acciones: ['leer'],
    moduloNombre: 'Actividades',
  })
  @Get(':id/cost')
  calculateCost(@Param('id') actividadId: string) {
    return this.actividadesService.calculateCost(actividadId);
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
  @Get(':id/reservas')
  getReservationsByActivity(@Param('id') actividadId: string) {
    return this.actividadesService.getReservationsByActivity(actividadId);
  }
}
