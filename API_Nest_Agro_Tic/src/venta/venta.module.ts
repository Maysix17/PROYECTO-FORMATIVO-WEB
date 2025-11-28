import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentaService } from './venta.service';
import { VentaController } from './venta.controller';
import { Venta } from './entities/venta.entity';
import { Cosecha } from '../cosechas/entities/cosecha.entity';
import { CosechasVentasModule } from '../cosechas_ventas/cosechas_ventas.module';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, Cosecha, Cultivo]),
    CosechasVentasModule,
    NotificationsModule,
  ],
  controllers: [VentaController],
  providers: [VentaService],
  exports: [VentaService],
})
export class VentaModule {}
