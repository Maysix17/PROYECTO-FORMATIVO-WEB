import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CosechasService } from './cosechas.service';
import { CosechasController } from './cosechas.controller';
import { Cosecha } from './entities/cosecha.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { CultivosVariedadXZona } from '../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';
import { CultivosXVariedad } from '../cultivos_x_variedad/entities/cultivos_x_variedad.entity';
import { Variedad } from '../variedad/entities/variedad.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cosecha,
      Cultivo,
      CultivosVariedadXZona,
      CultivosXVariedad,
      Variedad,
    ]),
    NotificationsModule,
  ],
  controllers: [CosechasController],
  providers: [CosechasService],
})
export class CosechasModule {}
