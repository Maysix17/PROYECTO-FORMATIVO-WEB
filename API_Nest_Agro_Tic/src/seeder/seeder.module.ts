import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { Roles } from '../roles/entities/role.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { SeederService } from './seeder.service';
import { Permiso } from 'src/permisos/entities/permiso.entity';
import { Ficha } from 'src/fichas/entities/ficha.entity';
import { TipoCultivo } from 'src/tipo_cultivo/entities/tipo_cultivo.entity';
import { Variedad } from 'src/variedad/entities/variedad.entity';
import { Cultivo } from 'src/cultivos/entities/cultivo.entity';
import { CultivosXVariedad } from 'src/cultivos_x_variedad/entities/cultivos_x_variedad.entity';
import { Zona } from 'src/zonas/entities/zona.entity';
import { CultivosVariedadXZona } from 'src/cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';
import { Actividad } from 'src/actividades/entities/actividades.entity';
import { UsuarioXActividad } from 'src/usuarios_x_actividades/entities/usuarios_x_actividades.entity';
import { Cosecha } from 'src/cosechas/entities/cosecha.entity';
import { Epa } from 'src/epa/entities/epa.entity';
import { TipoEpa } from 'src/tipo_epa/entities/tipo_epa.entity';
import { CultivosXEpa } from 'src/cultivos_x_epa/entities/cultivos_x_epa.entity';
import { Sensor } from 'src/sensor/entities/sensor.entity';
import { TipoSensor } from 'src/tipo_sensor/entities/tipo_sensor.entity';
import { MedicionSensor } from 'src/medicion_sensor/entities/medicion_sensor.entity';
import { Venta } from 'src/venta/entities/venta.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { Recurso } from 'src/recursos/entities/recurso.entity';
import { Bodega } from 'src/bodega/entities/bodega.entity';
import { Categoria } from 'src/categoria/entities/categoria.entity';
import { CategoriaActividad } from 'src/categoria_actividad/entities/categoria_actividad.entity';
import { UnidadMedida } from 'src/unidades_medida/entities/unidades_medida.entity';
import { Producto } from 'src/productos/entities/productos.entity';
import { LotesInventario } from 'src/lotes_inventario/entities/lotes_inventario.entity';
import { ReservasXActividad } from 'src/reservas_x_actividad/entities/reservas_x_actividad.entity';
import { MovimientosInventario } from 'src/movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from 'src/tipos_movimiento/entities/tipos_movimiento.entity';
import { EstadoReserva } from 'src/estados_reserva/entities/estados_reserva.entity';
import { EstadoFenologico } from 'src/estados_fenologicos/entities/estado_fenologico.entity';
import { CosechasVentas } from 'src/cosechas_ventas/entities/cosechas_ventas.entity';
import { MqttConfig } from 'src/mqtt_config/entities/mqtt_config.entity';

@Module({
  imports: [
    // Importamos AppModule para tener acceso a toda la configuración de la app,
    // como la conexión a la base de datos y variables de entorno.
    AppModule,
    // Al importar AppModule, ya tenemos acceso a los módulos de Usuarios y Permisos
    // y a sus providers exportados.
    // TypeOrmModule.forFeature es necesario aquí para que SeederService pueda inyectar los repositorios correspondientes.
    TypeOrmModule.forFeature([
      Roles,
      Usuario,
      Permiso,
      Ficha,
      TipoCultivo,
      Variedad,
      Cultivo,
      CultivosXVariedad,
      Zona,
      CultivosVariedadXZona,
      Actividad,
      UsuarioXActividad,
      Cosecha,
      Epa,
      TipoEpa,
      CultivosXEpa,
      Sensor,
      TipoSensor,
      MedicionSensor,
      Venta,
      Modulo,
      Recurso,
      Bodega,
      Categoria,
      CategoriaActividad,
      UnidadMedida,
      Producto,
      LotesInventario,
      ReservasXActividad,
      MovimientosInventario,
      TipoMovimiento,
      EstadoReserva,
      EstadoFenologico,
      CosechasVentas,
      MqttConfig,
    ]),
  ],
  providers: [SeederService, Logger],
})
export class SeederModule {}
