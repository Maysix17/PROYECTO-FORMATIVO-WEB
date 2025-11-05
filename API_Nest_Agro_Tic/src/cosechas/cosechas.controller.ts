import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CosechasService } from './cosechas.service';
import { CreateCosechaDto } from './dto/create-cosecha.dto';
import { UpdateCosechaDto } from './dto/update-cosecha.dto';

@Controller('cosechas')
export class CosechasController {
  constructor(private readonly cosechasService: CosechasService) {}

  @Post()
  create(@Body() createCosechaDto: CreateCosechaDto) {
    return this.cosechasService.create(createCosechaDto);
  }

  @Get()
  findAll() {
    return this.cosechasService.findAll();
  }

  @Get('today')
  findAllToday() {
    return this.cosechasService.findAllToday();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cosechasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCosechaDto: UpdateCosechaDto) {
    return this.cosechasService.update(id, updateCosechaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cosechasService.remove(id);
  }

  @Post(':id/close')
  closeHarvest(@Param('id') id: string) {
    return this.cosechasService.closeHarvest(id);
  }

  @Post(':id/close-sales')
  closeHarvestSales(@Param('id') id: string) {
    return this.cosechasService.closeHarvestSales(id);
  }

  @Post('cultivo/:cvzId/close-all-sales')
  closeAllHarvestSalesByCultivo(@Param('cvzId') cvzId: string) {
    return this.cosechasService.closeAllHarvestSalesByCultivo(cvzId);
  }

  @Get(':id/disponible')
  getCantidadDisponible(@Param('id') id: string) {
    return this.cosechasService.getCantidadDisponible(id);
  }

  @Get('cultivo/:cvzId')
  getCosechasByCultivo(@Param('cvzId') cvzId: string) {
    return this.cosechasService.getCosechasByCultivo(cvzId);
  }

  @Get('cultivo/:cvzId/abiertas')
  getCosechasAbiertasByCultivo(@Param('cvzId') cvzId: string) {
    return this.cosechasService.getCosechasAbiertasByCultivo(cvzId);
  }

  @Post('cultivo/:cvzId/close-all')
  closeAllHarvestsByCultivo(@Param('cvzId') cvzId: string) {
    return this.cosechasService.closeAllHarvestsByCultivo(cvzId);
  }
}
