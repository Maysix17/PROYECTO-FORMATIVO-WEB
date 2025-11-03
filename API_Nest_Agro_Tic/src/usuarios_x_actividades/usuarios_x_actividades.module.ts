import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosXActividadesService } from './usuarios_x_actividades.service';
import { UsuariosXActividadesController } from './usuarios_x_actividades.controller';
import { UsuarioXActividad } from './entities/usuarios_x_actividades.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioXActividad])],
  controllers: [UsuariosXActividadesController],
  providers: [UsuariosXActividadesService],
  exports: [UsuariosXActividadesService],
})
export class UsuariosXActividadesModule {}
