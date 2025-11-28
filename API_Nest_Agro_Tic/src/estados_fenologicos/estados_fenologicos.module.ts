import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadosFenologicosService } from './estados_fenologicos.service';
import { EstadosFenologicosController } from './estados_fenologicos.controller';
import { EstadoFenologico } from './entities/estado_fenologico.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoFenologico])],
  controllers: [EstadosFenologicosController],
  providers: [EstadosFenologicosService],
  exports: [EstadosFenologicosService],
})
export class EstadosFenologicosModule {}
