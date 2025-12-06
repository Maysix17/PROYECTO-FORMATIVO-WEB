import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadesService } from './actividades.service';
import { ActividadesController } from './actividades.controller';
import { Actividad } from './entities/actividades.entity';
import { ReservasXActividad } from '../reservas_x_actividad/entities/reservas_x_actividad.entity';
import { ReservasXActividadModule } from '../reservas_x_actividad/reservas_x_actividad.module';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { MovimientosInventarioModule } from '../movimientos_inventario/movimientos_inventario.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Actividad, ReservasXActividad, Usuario]),
    ReservasXActividadModule,
    MovimientosInventarioModule, AuthModule
  ],
  providers: [ActividadesService],
  controllers: [ActividadesController],
  exports: [TypeOrmModule], // opcional, si otros módulos también usan Actividad
})
export class ActividadesModule {}
