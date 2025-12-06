import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosXActividadesService } from './usuarios_x_actividades.service';
import { UsuariosXActividadesController } from './usuarios_x_actividades.controller';
import { UsuarioXActividad } from './entities/usuarios_x_actividades.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioXActividad]),
    forwardRef(() => NotificationsModule), AuthModule
  ],
  controllers: [UsuariosXActividadesController],
  providers: [UsuariosXActividadesService],
  exports: [UsuariosXActividadesService],
})
export class UsuariosXActividadesModule {}
