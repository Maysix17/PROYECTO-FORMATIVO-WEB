import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LotesInventarioService } from './lotes_inventario.service';
import { LotesInventarioController } from './lotes_inventario.controller';
import { LotesInventario } from './entities/lotes_inventario.entity';
import { MovimientosInventario } from '../movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from '../tipos_movimiento/entities/tipos_movimiento.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { MovimientosInventarioModule } from '../movimientos_inventario/movimientos_inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LotesInventario,
      MovimientosInventario,
      TipoMovimiento,
      Usuario,
    ]),
    MovimientosInventarioModule,
  ],
  controllers: [LotesInventarioController],
  providers: [LotesInventarioService],
})
export class LotesInventarioModule {}
