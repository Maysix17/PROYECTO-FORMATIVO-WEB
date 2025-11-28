import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CosechasVentas } from './entities/cosechas_ventas.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CosechasVentas])],
  providers: [],
  exports: [TypeOrmModule],
})
export class CosechasVentasModule {}
