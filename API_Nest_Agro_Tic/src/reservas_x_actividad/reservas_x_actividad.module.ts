import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservasXActividadService } from './reservas_x_actividad.service';
import { ReservasXActividadController } from './reservas_x_actividad.controller';
import { ReservasXActividad } from './entities/reservas_x_actividad.entity';
import { Actividad } from '../actividades/entities/actividades.entity';
import { EstadoReserva } from '../estados_reserva/entities/estados_reserva.entity';
import { LotesInventario } from '../lotes_inventario/entities/lotes_inventario.entity';
import { MovimientosInventario } from '../movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from '../tipos_movimiento/entities/tipos_movimiento.entity';
import { UsuariosXActividadesModule } from '../usuarios_x_actividades/usuarios_x_actividades.module';
import { MovimientosInventarioModule } from '../movimientos_inventario/movimientos_inventario.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservasXActividad,
      Actividad,
      EstadoReserva,
      LotesInventario,
      MovimientosInventario,
      TipoMovimiento,
    ]),
    UsuariosXActividadesModule,
    MovimientosInventarioModule,
    AuthModule
  ],
  controllers: [ReservasXActividadController],
  providers: [ReservasXActividadService],
  exports: [ReservasXActividadService],
})
export class ReservasXActividadModule {}
