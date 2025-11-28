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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReservasXActividadService } from './reservas_x_actividad.service';
import { CreateReservasXActividadDto } from './dto/create-reservas_x_actividad.dto';
import { UpdateReservasXActividadDto } from './dto/update-reservas_x_actividad.dto';
import { FinalizeActivityDto } from './dto/finalize-activity.dto';

@Controller('reservas-x-actividad')
export class ReservasXActividadController {
  constructor(
    private readonly reservasXActividadService: ReservasXActividadService,
  ) {}

  @Post()
  create(@Body() createReservasXActividadDto: CreateReservasXActividadDto) {
    return this.reservasXActividadService.create(createReservasXActividadDto);
  }

  @Get()
  findAll() {
    return this.reservasXActividadService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservasXActividadService.findOne(id);
  }

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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservasXActividadService.remove(id);
  }
}
