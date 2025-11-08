import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosInventarioService } from './movimientos_inventario.service';
import { MovimientosInventarioController } from './movimientos_inventario.controller';
import { MovimientosInventario } from './entities/movimientos_inventario.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientosInventario]),
    NotificationsModule,
  ],
  controllers: [MovimientosInventarioController],
  providers: [MovimientosInventarioService],
  exports: [MovimientosInventarioService],
})
export class MovimientosInventarioModule {}
