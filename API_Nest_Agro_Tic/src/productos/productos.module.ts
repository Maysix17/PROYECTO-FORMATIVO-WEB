import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto } from './entities/productos.entity';
import { MovimientosInventario } from '../movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from '../tipos_movimiento/entities/tipos_movimiento.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { MovimientosInventarioModule } from '../movimientos_inventario/movimientos_inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      MovimientosInventario,
      TipoMovimiento,
      Usuario,
    ]),
    MovimientosInventarioModule,
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}
