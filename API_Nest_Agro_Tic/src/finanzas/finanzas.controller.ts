import { Controller, Get, Param } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { FinanzasDataDto } from './dto/finanzas-data.dto';

@Controller('finanzas')
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('cosecha/:cosechaId')
  async obtenerFinanzasCosecha(
    @Param('cosechaId') cosechaId: string,
  ): Promise<FinanzasDataDto | null> {
    return await this.finanzasService.obtenerFinanzasCosecha(cosechaId);
  }

  @Get('cosecha/:cosechaId/calcular')
  async calcularFinanzasCosecha(
    @Param('cosechaId') cosechaId: string,
  ): Promise<FinanzasDataDto> {
    return await this.finanzasService.calcularFinanzasCosecha(cosechaId);
  }

  @Get('cultivo/:cultivoId')
  async obtenerFinanzasCultivo(
    @Param('cultivoId') cultivoId: string,
  ): Promise<FinanzasDataDto[]> {
    return await this.finanzasService.obtenerFinanzasCultivo(cultivoId);
  }

  @Get('cultivo/:cultivoId/dinamico')
  async calcularFinanzasCultivoDinamico(
    @Param('cultivoId') cultivoId: string,
  ): Promise<FinanzasDataDto> {
    return await this.finanzasService.calcularFinanzasCultivoDinamico(
      cultivoId,
    );
  }

  @Get('cultivo/:cultivoId/actividades')
  async calcularFinanzasCultivoActividades(
    @Param('cultivoId') cultivoId: string,
  ): Promise<FinanzasDataDto> {
    return await this.finanzasService.calcularFinanzasCultivoActividades(
      cultivoId,
    );
  }
}
