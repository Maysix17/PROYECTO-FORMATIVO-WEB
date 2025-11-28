import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasService } from './finanzas.service';
import { FinanzasController } from './finanzas.controller';
import { Cosecha } from '../cosechas/entities/cosecha.entity';
import { ReservasXActividad } from '../reservas_x_actividad/entities/reservas_x_actividad.entity';
import { Actividad } from '../actividades/entities/actividades.entity';
import { Venta } from '../venta/entities/venta.entity';
import { CultivosVariedadXZona } from '../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cosecha,
      ReservasXActividad,
      Actividad,
      Venta,
      CultivosVariedadXZona,
    ]),
  ],
  controllers: [FinanzasController],
  providers: [FinanzasService],
  exports: [FinanzasService],
})
export class FinanzasModule {}
