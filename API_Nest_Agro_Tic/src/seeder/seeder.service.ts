// src/seeder/seeder.service.ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Asumo que tienes estos servicios y entidades. Ajusta las rutas si es necesario.
import { PermisosService } from '../permisos/permisos.service';
import { Roles as Rol } from '../roles/entities/role.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { UsuariosService } from '../usuarios/usuarios.service';
import { BodegaService } from '../bodega/bodega.service';
import { CategoriaService } from '../categoria/categoria.service'; // Asegúrate que la ruta es correcta
import { Ficha } from '../fichas/entities/ficha.entity';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';
import { Variedad } from '../variedad/entities/variedad.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { CultivosXVariedad } from '../cultivos_x_variedad/entities/cultivos_x_variedad.entity';
import { Zona } from '../zonas/entities/zona.entity';
import { Repository } from 'typeorm';
import { CultivosVariedadXZona } from '../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';
import { Actividad } from '../actividades/entities/actividades.entity';
import { UsuarioXActividad } from '../usuarios_x_actividades/entities/usuarios_x_actividades.entity';
import { Cosecha } from '../cosechas/entities/cosecha.entity';
import { Bodega } from '../bodega/entities/bodega.entity';
import { Categoria } from '../categoria/entities/categoria.entity';
import { CategoriaActividad } from '../categoria_actividad/entities/categoria_actividad.entity';
import { UnidadMedida } from '../unidades_medida/entities/unidades_medida.entity';
import { Producto } from '../productos/entities/productos.entity';
import { LotesInventario } from '../lotes_inventario/entities/lotes_inventario.entity';
import { ReservasXActividad } from '../reservas_x_actividad/entities/reservas_x_actividad.entity';
import { MovimientosInventario } from '../movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from '../tipos_movimiento/entities/tipos_movimiento.entity';
import { EstadoReserva } from '../estados_reserva/entities/estados_reserva.entity';
import { EstadoFenologico } from '../estados_fenologicos/entities/estado_fenologico.entity';
import { CosechasVentas } from '../cosechas_ventas/entities/cosechas_ventas.entity';
import { Venta } from '../venta/entities/venta.entity';
import { MqttConfig } from '../mqtt_config/entities/mqtt_config.entity';
// Acciones comunes para reutilizar y mantener consistencia
const ACCIONES_CRUD = ['leer', 'crear', 'actualizar', 'eliminar'];
const ACCION_VER = ['ver'];

// Definimos los permisos base que necesita la aplicación
const PERMISOS_BASE = [
  // Módulo de Inicio (Generalmente solo lectura)
  { moduloNombre: 'Inicio', recurso: 'acceso_inicio', acciones: ACCION_VER },
  { moduloNombre: 'Inicio', recurso: 'dashboard', acciones: ['leer'] },

  { moduloNombre: 'Usuarios', recurso: 'usuarios', acciones: ACCIONES_CRUD },
  { moduloNombre: 'Usuarios', recurso: 'roles', acciones: ACCIONES_CRUD },
  { moduloNombre: 'Usuarios', recurso: 'panel de control', acciones: ['ver'] },

  // Módulo de zonas
  { moduloNombre: 'zonas', recurso: 'acceso_zonas', acciones: ACCION_VER },
  { moduloNombre: 'zonas', recurso: 'zonas', acciones: ACCIONES_CRUD },

  // Módulo de Cultivos
  {
    moduloNombre: 'Cultivos',
    recurso: 'acceso_cultivos',
    acciones: ACCION_VER,
  },
  { moduloNombre: 'Cultivos', recurso: 'cultivos', acciones: ACCIONES_CRUD },
  { moduloNombre: 'Cultivos', recurso: 'lotes', acciones: ACCIONES_CRUD },

  // Módulo de Inventario
  {
    moduloNombre: 'Inventario',
    recurso: 'acceso_inventario',
    acciones: ACCION_VER,
  },
  {
    moduloNombre: 'Inventario',
    recurso: 'items_inventario',
    acciones: ACCIONES_CRUD,
  },
  // Los movimientos son registros, no se editan/borran
  {
    moduloNombre: 'Inventario',
    recurso: 'movimientos_inventario',
    acciones: ['leer', 'crear'],
  },
];

@Injectable()
export class SeederService {
  constructor(
    private readonly logger: Logger,
    private readonly permisosService: PermisosService,
    private readonly usuariosService: UsuariosService,
    private readonly bodegaService: BodegaService,
    private readonly categoriaService: CategoriaService,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Permiso)
    private readonly permisoRepository: Repository<Permiso>,
    @InjectRepository(Ficha)
    private readonly fichaRepository: Repository<Ficha>,
    @InjectRepository(TipoCultivo)
    private readonly tipoCultivoRepository: Repository<TipoCultivo>,
    @InjectRepository(Variedad)
    private readonly variedadRepository: Repository<Variedad>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(CultivosXVariedad)
    private readonly cultivosXVariedadRepository: Repository<CultivosXVariedad>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    @InjectRepository(CultivosVariedadXZona)
    private readonly cultivosVariedadXZonaRepository: Repository<CultivosVariedadXZona>,
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
    @InjectRepository(UsuarioXActividad)
    private readonly usuarioXActividadRepository: Repository<UsuarioXActividad>,
    @InjectRepository(Cosecha)
    private readonly cosechaRepository: Repository<Cosecha>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    @InjectRepository(CategoriaActividad)
    private readonly categoriaActividadRepository: Repository<CategoriaActividad>,
    @InjectRepository(UnidadMedida)
    private readonly unidadMedidaRepository: Repository<UnidadMedida>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(LotesInventario)
    private readonly lotesInventarioRepository: Repository<LotesInventario>,
    @InjectRepository(ReservasXActividad)
    private readonly reservasXActividadRepository: Repository<ReservasXActividad>,
    @InjectRepository(MovimientosInventario)
    private readonly movimientosInventarioRepository: Repository<MovimientosInventario>,
    @InjectRepository(TipoMovimiento)
    private readonly tipoMovimientoRepository: Repository<TipoMovimiento>,
    @InjectRepository(EstadoReserva)
    private readonly estadoReservaRepository: Repository<EstadoReserva>,
    @InjectRepository(EstadoFenologico)
    private readonly estadoFenologicoRepository: Repository<EstadoFenologico>,
    @InjectRepository(CosechasVentas)
    private readonly cosechasVentasRepository: Repository<CosechasVentas>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(MqttConfig)
    private readonly mqttConfigRepository: Repository<MqttConfig>,
  ) {}

  async seed() {
    this.logger.log('Iniciando el proceso de seeding...', 'Seeder');

    // 1. Sincronizar Permisos Base usando tu endpoint/servicio
    await this.seedPermisos();

    // 3. Crear bodegas y categorías base
    await this.seedBodegasYCategorias();

    // 4. Crear roles
    const rolAdmin = await this.seedRolAdmin();
    const { rolInstructor, rolAprendiz } = await this.seedRolesAdicionales();

    // 5. Crear el Usuario Administrador
    if (rolAdmin) {
      await this.seedUsuarioAdmin(rolAdmin);
    } else {
      this.logger.error(
        'No se pudo crear el usuario admin porque el rol no fue encontrado o creado.',
        'Seeder',
      );
    }

    // 6. Crear el Usuario Instructor
    if (rolInstructor) {
      await this.seedUsuarioInstructor(rolInstructor);
    } else {
      this.logger.warn(
        'No se pudo crear el usuario instructor porque el rol no fue encontrado.',
        'Seeder',
      );
    }

    // 7. Crear fichas de muestra
    await this.seedFichas();

    // 8. Crear el Usuario Aprendiz
    if (rolAprendiz) {
      await this.seedUsuarioAprendiz(rolAprendiz);
    } else {
      this.logger.warn(
        'No se pudo crear el usuario aprendiz porque el rol no fue encontrado.',
        'Seeder',
      );
    }

    // 9. Crear usuarios aprendices con fichas
    this.logger.log('Llamando a seedUsuariosAprendices...', 'Seeder');
    await this.seedUsuariosAprendices();

    // 10. Seed agricultural data
    await this.seedTipoCultivo();
    await this.seedVariedad();
    await this.seedMapa();
    await this.seedZona();
    await this.seedEstadosFenologicos();
    await this.seedCultivo();
    await this.seedCultivosXVariedad();
    await this.seedCultivosVariedadXZona();
    await this.seedCosechas();
    await this.seedVentas();
    await this.seedCategoriaActividad();

    // New reservation-related seeding
    await this.seedUnidadesMedida();
    await this.seedProductos();
    await this.seedLotesInventario();
    await this.seedTiposMovimiento();
    await this.seedEstadosReserva();

    // Seed reservations and movements for financial testing
    await this.seedReservasXActividad();
    await this.seedMovimientosInventario();

    // Seed MQTT configurations
    await this.seedMqttConfigs();

    this.logger.log('Seeding completado exitosamente.', 'Seeder');
  }

  private async seedPermisos() {
    this.logger.log('Sincronizando permisos base...', 'Seeder');
    try {
      for (const permisoData of PERMISOS_BASE) {
        // Usamos el servicio que ya tienes para evitar duplicados
        await this.permisosService.sincronizarPermisos(permisoData);
      }
      this.logger.log('Permisos base sincronizados.', 'Seeder');
    } catch (error) {
      this.logger.error(
        'Error sincronizando permisos: ' + error.message,
        'Seeder',
      );
    }
  }

  private async seedRolAdmin(): Promise<Rol | null> {
    const nombreRol = 'ADMIN';
    try {
      let rol = await this.rolRepository.findOne({
        where: { nombre: nombreRol },
      });

      if (!rol) {
        this.logger.log(`Creando el rol "${nombreRol}"...`, 'Seeder');
        const todosLosPermisos = await this.permisoRepository.find();
        if (todosLosPermisos.length === 0) {
          this.logger.warn(
            'No se encontraron permisos para asignar al rol admin. ¿Se ejecutó seedPermisos() correctamente?',
            'Seeder',
          );
        }
        rol = this.rolRepository.create({
          nombre: nombreRol,
          permisos: todosLosPermisos,
        });
        await this.rolRepository.save(rol);

        // No se configura jerarquía compleja, solo validación simple en el servicio

        this.logger.log(
          `Rol "${nombreRol}" creado con ${todosLosPermisos.length} permisos.`,
          'Seeder',
        );
      } else {
        this.logger.log(
          `El rol "${nombreRol}" ya existe. Omitiendo creación.`,
          'Seeder',
        );
      }
      return rol;
    } catch (error) {
      this.logger.error(
        `Error creando el rol admin: ${error.message}`,
        'Seeder',
      );
      return null;
    }
  }

  private async seedRolesAdicionales(): Promise<{
    rolInstructor: Rol | null;
    rolAprendiz: Rol | null;
  }> {
    this.logger.log('Creando roles adicionales...', 'Seeder');
    try {
      // Crear roles base si no existen
      let rolInstructor = await this.crearRolSiNoExiste('INSTRUCTOR');
      const rolAprendiz = await this.crearRolSiNoExiste('APRENDIZ');

      // Crear otros roles sin permisos especiales
      await this.crearRolSiNoExiste('PASANTE');
      await this.crearRolSiNoExiste('INVITADO');

      // Asignar permisos específicos al INSTRUCTOR
      const allPermisos = await this.permisoRepository.find({
        relations: ['recurso'],
      });
      const permisoCrearUsuarios = allPermisos.find(
        (p) => p.accion === 'crear' && p.recurso.nombre === 'usuarios',
      );

      if (rolInstructor && permisoCrearUsuarios) {
        // Cargamos el rol con sus permisos para no sobreescribirlos
        const rolInstructorConPermisos = await this.rolRepository.findOne({
          where: { id: rolInstructor.id },
          relations: ['permisos'],
        });

        // ✅ Comprobamos que el rol se encontró antes de usarlo
        if (rolInstructorConPermisos) {
          const tienePermiso = rolInstructorConPermisos.permisos.some(
            (p) => p.id === permisoCrearUsuarios.id,
          );
          if (!tienePermiso) {
            rolInstructorConPermisos.permisos.push(permisoCrearUsuarios);
            await this.rolRepository.save(rolInstructorConPermisos);
            this.logger.log(
              `Permiso 'crear usuarios' asignado a INSTRUCTOR.`,
              'Seeder',
            );
          }
          rolInstructor = rolInstructorConPermisos; // Reasignamos para el resto de la función
        }
      }

      // Asignar permisos de acceso a módulos para INVITADO e INSTRUCTOR
      const permisosAcceso = allPermisos.filter(
        (p) =>
          p.accion === 'ver' &&
          ['acceso_inicio', 'acceso_zonas', 'acceso_cultivos'].includes(
            p.recurso.nombre,
          ),
      );

      const asignarPermisosARol = async (rol: Rol, nombreRol: string) => {
        if (rol && permisosAcceso.length > 0) {
          const rolConPermisos = await this.rolRepository.findOne({
            where: { id: rol.id },
            relations: ['permisos'],
          });
          if (rolConPermisos) {
            for (const permiso of permisosAcceso) {
              const tienePermiso = rolConPermisos.permisos.some(
                (p) => p.id === permiso.id,
              );
              if (!tienePermiso) {
                rolConPermisos.permisos.push(permiso);
              }
            }
            await this.rolRepository.save(rolConPermisos);
            this.logger.log(
              `Permisos de acceso asignados a ${nombreRol}.`,
              'Seeder',
            );
          }
        }
      };

      const rolInvitado = await this.rolRepository.findOneBy({
        nombre: 'INVITADO',
      });
      if (rolInvitado) {
        await asignarPermisosARol(rolInvitado, 'INVITADO');
      }
      if (rolInstructor) {
        await asignarPermisosARol(rolInstructor, 'INSTRUCTOR');
      }

      return { rolInstructor, rolAprendiz };
    } catch (error) {
      this.logger.error(
        `Error creando roles adicionales: ${error.message}`,
        'Seeder',
      );
      return { rolInstructor: null, rolAprendiz: null };
    }
  }

  private async crearRolSiNoExiste(nombre: string): Promise<Rol> {
    let rol = await this.rolRepository.findOneBy({ nombre });
    if (!rol) {
      rol = this.rolRepository.create({ nombre, permisos: [] });
      await this.rolRepository.save(rol);
      this.logger.log(`Rol "${nombre}" creado.`, 'Seeder');
    }
    return rol;
  }

  private async seedBodegasYCategorias() {
    this.logger.log('Creando bodegas y categorías base...', 'Seeder');
    try {
      // --- Crear Bodega ---
      const nombreBodega = 'Bodega Principal';
      const bodegas = await this.bodegaService.findAll();
      let bodega = bodegas.find((b) => b.nombre === nombreBodega);

      if (!bodega) {
        bodega = await this.bodegaService.create({
          nombre: nombreBodega,
          numero: 'B001', // Campo 'numero' añadido para cumplir con la entidad
        });
        this.logger.log(`Bodega "${nombreBodega}" creada.`, 'Seeder');
      } else {
        this.logger.log(
          `Bodega "${nombreBodega}" ya existe. Omitiendo.`,
          'Seeder',
        );
      }

      // --- Crear Categorías ---
      const categoriasNombres = [
        {
          nombre: 'Nutrición y Suelo',
          descripcion:
            'Aportar nutrientes, modificar o mejorar las condiciones físico-químicas del terreno.',
          esDivisible: true,
        },
        {
          nombre: 'Sanidad Vegetal',
          descripcion:
            'Proteger los cultivos del ataque de plagas, enfermedades y malezas.',
          esDivisible: true,
        },
        {
          nombre: 'Material de Propagación',
          descripcion: 'Iniciar, regenerar o reemplazar el cultivo.',
          esDivisible: true,
        },
        {
          nombre: 'Equipo y Herramientas',
          descripcion:
            'Facilitar las labores de siembra, manejo y cosecha de forma manual o mecánica.',
          esDivisible: false,
        },
        {
          nombre: 'Suministros Auxiliares',
          descripcion:
            'Dar soporte a la infraestructura del cultivo y garantizar la seguridad del personal.',
          esDivisible: false,
        },
      ];
      const categorias = await this.categoriaService.findAll();

      for (const catData of categoriasNombres) {
        const categoria = categorias.find((c) => c.nombre === catData.nombre);

        if (!categoria) {
          await this.categoriaService.create({
            nombre: catData.nombre,
            descripcion: catData.descripcion,
            esDivisible: catData.esDivisible,
          });
          this.logger.log(`Categoría "${catData.nombre}" creada.`, 'Seeder');
        } else {
          this.logger.log(
            `Categoría "${catData.nombre}" ya existe. Omitiendo.`,
            'Seeder',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creando bodegas y categorías: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedUsuarioAdmin(rolAdmin: Rol) {
    const dniAdmin = 123456789; // DNI por defecto para el admin (como string)
    try {
      const existeUsuario = await this.usuarioRepository.findOne({
        where: { dni: dniAdmin },
      });

      if (!existeUsuario) {
        this.logger.log('Creando el usuario administrador...', 'Seeder');

        // Llamamos al servicio que ya se encarga de hashear y guardar
        await this.usuariosService.createUserByPanel({
          nombres: 'Admin',
          apellidos: 'del Sistema',
          dni: dniAdmin,
          correo: 'admin@example.com',
          password: 'admin123', // 1. Pasamos la contraseña en texto plano
          telefono: 3144518847,
          rolId: rolAdmin.id, // 2. Pasamos el ID del rol que ya obtuvimos
        });

        this.logger.log('Usuario administrador creado.', 'Seeder');
        this.logger.warn(
          `Usuario: ${dniAdmin}, Contraseña: admin123 ¡Cámbiala en producción!`,
          'Seeder',
        );
      } else {
        this.logger.log(
          'El usuario administrador ya existe. Omitiendo creación.',
          'Seeder',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error creando el usuario admin: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedUsuarioInstructor(rolInstructor: Rol) {
    const dniInstructor = 987654321;
    try {
      const existeUsuario = await this.usuarioRepository.findOne({
        where: { dni: dniInstructor },
      });

      if (!existeUsuario) {
        this.logger.log('Creando el usuario instructor...', 'Seeder');

        await this.usuariosService.createUserByPanel({
          nombres: 'Instructor',
          apellidos: 'de Prueba',
          dni: dniInstructor,
          correo: 'instructor@example.com',
          password: 'instructor123',
          telefono: 3001234567,
          rolId: rolInstructor.id,
        });

        this.logger.log('Usuario instructor creado.', 'Seeder');
        this.logger.warn(
          `Usuario: ${dniInstructor}, Contraseña: instructor123`,
          'Seeder',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error creando el usuario instructor: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedUsuarioAprendiz(rolAprendiz: Rol) {
    const dniAprendiz = 111111111;
    try {
      const existeUsuario = await this.usuarioRepository.findOne({
        where: { dni: dniAprendiz },
      });

      if (!existeUsuario) {
        this.logger.log('Creando el usuario aprendiz...', 'Seeder');

        // Find a ficha to assign
        const ficha = await this.fichaRepository.findOne({
          where: { numero: 2925484 },
        });

        await this.usuariosService.createUserByPanel({
          nombres: 'Aprendiz',
          apellidos: 'de Prueba',
          dni: dniAprendiz,
          correo: 'aprendiz@example.com',
          password: 'aprendiz123',
          telefono: 3007654321,
          rolId: rolAprendiz.id,
          fichaId: ficha ? ficha.id : undefined,
        });

        this.logger.log('Usuario aprendiz creado.', 'Seeder');
        this.logger.warn(
          `Usuario: ${dniAprendiz}, Contraseña: aprendiz123`,
          'Seeder',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error creando el usuario aprendiz: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedFichas() {
    this.logger.log('Creando fichas de muestra...', 'Seeder');
    try {
      const fichasData = [
        { numero: 2925484 },
        { numero: 1987654 },
        { numero: 3456789 },
        { numero: 4567890 },
        { numero: 5678901 },
      ];

      for (const fichaData of fichasData) {
        let ficha = await this.fichaRepository.findOne({
          where: { numero: fichaData.numero },
        });
        if (!ficha) {
          ficha = this.fichaRepository.create({
            numero: fichaData.numero,
          });
          await this.fichaRepository.save(ficha);
          this.logger.log(`Ficha ${fichaData.numero} creada.`, 'Seeder');
        }
      }

      // Assign ficha only to APRENDIZ
      const dniAprendiz = 111111111;
      const fichaAprendiz = await this.fichaRepository.findOne({
        where: { numero: 2925484 },
      });
      const aprendiz = await this.usuarioRepository.findOne({
        where: { dni: dniAprendiz },
        relations: ['ficha'],
      });
      if (aprendiz && fichaAprendiz) {
        if (!aprendiz.ficha) {
          aprendiz.ficha = fichaAprendiz;
          await this.usuarioRepository.save(aprendiz);
          this.logger.log('Ficha asignada al usuario APRENDIZ.', 'Seeder');
        }
      }
    } catch (error) {
      this.logger.error(`Error creando fichas: ${error.message}`, 'Seeder');
    }
  }

  private async seedUsuariosAprendices() {
    this.logger.log('Creando usuarios aprendices con fichas...', 'Seeder');
    try {
      const rolAprendiz = await this.rolRepository.findOneBy({
        nombre: 'APRENDIZ',
      });
      if (!rolAprendiz) {
        this.logger.warn(
          'Rol APRENDIZ no encontrado. Saltando creación de aprendices.',
          'Seeder',
        );
        return;
      }
      this.logger.log(`Rol APRENDIZ encontrado: ${rolAprendiz.id}`, 'Seeder');

      const fichas = await this.fichaRepository.find();
      if (fichas.length === 0) {
        this.logger.warn(
          'No hay fichas disponibles. Saltando creación de aprendices.',
          'Seeder',
        );
        return;
      }
      this.logger.log(`Fichas encontradas: ${fichas.length}`, 'Seeder');
      this.logger.log('Iniciando creación de aprendices...', 'Seeder');

      const aprendicesData = [
        { nombres: 'Juan', apellidos: 'Pérez', dni: 222222222, fichaIndex: 0 },
        { nombres: 'María', apellidos: 'Gómez', dni: 333333333, fichaIndex: 1 },
        {
          nombres: 'Carlos',
          apellidos: 'Rodríguez',
          dni: 444444444,
          fichaIndex: 2,
        },
        {
          nombres: 'Ana',
          apellidos: 'Martínez',
          dni: 555555555,
          fichaIndex: 3,
        },
        {
          nombres: 'Luis',
          apellidos: 'Hernández',
          dni: 666666666,
          fichaIndex: 4,
        },
        { nombres: 'Sofia', apellidos: 'López', dni: 777777777, fichaIndex: 0 }, // misma ficha que Juan
        {
          nombres: 'Diego',
          apellidos: 'González',
          dni: 888888888,
          fichaIndex: 1,
        }, // misma ficha que María
        {
          nombres: 'Valentina',
          apellidos: 'Díaz',
          dni: 999999999,
          fichaIndex: 2,
        },
        {
          nombres: 'Mateo',
          apellidos: 'Torres',
          dni: 101010101,
          fichaIndex: 3,
        },
        {
          nombres: 'Isabella',
          apellidos: 'Ramírez',
          dni: 111111112,
          fichaIndex: 4,
        },
      ];

      for (const aprendizData of aprendicesData) {
        this.logger.log(
          `Procesando aprendiz: ${aprendizData.nombres} ${aprendizData.apellidos}`,
          'Seeder',
        );
        const existeUsuario = await this.usuarioRepository.findOne({
          where: { dni: aprendizData.dni },
        });

        if (!existeUsuario) {
          this.logger.log(
            `Usuario no existe, creando: ${aprendizData.nombres}`,
            'Seeder',
          );
          const ficha = fichas[aprendizData.fichaIndex % fichas.length];
          try {
            await this.usuariosService.createUserByPanel({
              nombres: aprendizData.nombres,
              apellidos: aprendizData.apellidos,
              dni: aprendizData.dni,
              correo: `${aprendizData.nombres.toLowerCase()}@example.com`,
              password: 'aprendiz123',
              telefono: 300000000 + (aprendizData.dni % 1000000),
              rolId: rolAprendiz.id,
              fichaId: ficha.id,
            });
            this.logger.log(
              `Usuario ${aprendizData.nombres} creado exitosamente.`,
              'Seeder',
            );
          } catch (createError) {
            this.logger.error(
              `Error creando usuario ${aprendizData.nombres}: ${createError.message}`,
              'Seeder',
            );
            continue;
          }

          // Asignar ficha
          const nuevoUsuario = await this.usuarioRepository.findOne({
            where: { dni: aprendizData.dni },
            relations: ['ficha'],
          });
          if (nuevoUsuario && ficha) {
            nuevoUsuario.ficha = ficha;
            await this.usuarioRepository.save(nuevoUsuario);
            this.logger.log(
              `Usuario ${aprendizData.nombres} asignado a ficha ${ficha.numero}.`,
              'Seeder',
            );
          } else {
            this.logger.warn(
              `No se pudo asignar ficha a ${aprendizData.nombres}`,
              'Seeder',
            );
          }
        } else {
          this.logger.log(
            `Usuario ${aprendizData.nombres} ya existe, saltando.`,
            'Seeder',
          );
        }
      }
      this.logger.log('Creación de usuarios aprendices completada.', 'Seeder');
    } catch (error) {
      this.logger.error(
        `Error creando usuarios aprendices: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedTipoCultivo() {
    this.logger.log(
      'Creando tipos de cultivo base con clasificación perenne/transitorio...',
      'Seeder',
    );
    try {
      const tipos = [
        { nombre: 'Tomate', esPerenne: false },
        { nombre: 'Papa', esPerenne: false },
        { nombre: 'Maíz', esPerenne: false },
        { nombre: 'Café', esPerenne: true },
        { nombre: 'Cacao', esPerenne: true },
        { nombre: 'Plátano', esPerenne: true },
      ];
      for (const tipoData of tipos) {
        let tipo = await this.tipoCultivoRepository.findOne({
          where: { nombre: tipoData.nombre },
        });
        if (!tipo) {
          tipo = this.tipoCultivoRepository.create({
            nombre: tipoData.nombre,
            esPerenne: tipoData.esPerenne,
          });
          await this.tipoCultivoRepository.save(tipo);
          const tipoTexto = tipoData.esPerenne ? 'perenne' : 'transitorio';
          this.logger.log(
            `Tipo de cultivo "${tipoData.nombre}" (${tipoTexto}) creado.`,
            'Seeder',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creando tipos de cultivo: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedVariedad() {
    this.logger.log(
      'Creando variedades base para tipos perennes y transitorios...',
      'Seeder',
    );
    try {
      const variedades = [
        // Transitorios
        { nombre: 'Cherry', tipo: 'Tomate' },
        { nombre: 'Roma', tipo: 'Tomate' },
        { nombre: 'Criolla', tipo: 'Papa' },
        { nombre: 'Pastusa', tipo: 'Papa' },
        { nombre: 'Dulce', tipo: 'Maíz' },
        { nombre: 'Amarillo', tipo: 'Maíz' },
        // Perennes
        { nombre: 'Caturra', tipo: 'Café' },
        { nombre: 'Catimor', tipo: 'Café' },
        { nombre: 'Criollo', tipo: 'Cacao' },
        { nombre: 'Trinitario', tipo: 'Cacao' },
        { nombre: 'Cavendish', tipo: 'Plátano' },
        { nombre: 'Bucatán', tipo: 'Plátano' },
      ];
      for (const v of variedades) {
        const tipo = await this.tipoCultivoRepository.findOne({
          where: { nombre: v.tipo },
        });
        if (tipo) {
          let variedad = await this.variedadRepository.findOne({
            where: { nombre: v.nombre },
          });
          if (!variedad) {
            variedad = this.variedadRepository.create({
              nombre: v.nombre,
              fkTipoCultivoId: tipo.id,
            });
            await this.variedadRepository.save(variedad);
            const tipoTexto = tipo.esPerenne ? 'perenne' : 'transitorio';
            this.logger.log(
              `Variedad "${v.nombre}" (${tipoTexto}) creada.`,
              'Seeder',
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error creando variedades: ${error.message}`, 'Seeder');
    }
  }

  private async seedMapa() {
    this.logger.log(
      'Saltando creación de mapas - funcionalidad eliminada...',
      'Seeder',
    );
  }

  private async seedZona() {
    this.logger.log(
      'Creando zonas base en Tecnoparque Yamboro con coordenadas precisas...',
      'Seeder',
    );
    try {
      // Coordenadas aproximadas del Tecnoparque Yamboro (basado en el iframe proporcionado)
      // Centro aproximado: 1.89198666325594, -76.09094382831114
      const baseLat = 1.89198666325594;
      const baseLng = -76.09094382831114;

      const zonas = [
        // 2 puntos con distancia de 50-100 metros
        {
          nombre: 'Zona Principal Tecnoparque',
          coordenadas: {
            type: 'point' as const,
            coordinates: {
              lat: baseLat,
              lng: baseLng,
            },
          },
          areaMetrosCuadrados: 1000,
        },
        {
          nombre: 'Zona de Investigación',
          coordenadas: {
            type: 'point' as const,
            coordinates: {
              lat: baseLat + 0.0005, // ~55 metros al norte
              lng: baseLng + 0.0007, // ~55 metros al este
            },
          },
          areaMetrosCuadrados: 800,
        },
        // 3 polígonos con distancia de 50-100 metros
        {
          nombre: 'Área de Siembra 1',
          coordenadas: {
            type: 'polygon' as const,
            coordinates: [
              { lat: baseLat - 0.0003, lng: baseLng - 0.0004 },
              { lat: baseLat - 0.0003, lng: baseLng + 0.0004 },
              { lat: baseLat + 0.0003, lng: baseLng + 0.0004 },
              { lat: baseLat + 0.0003, lng: baseLng - 0.0004 },
            ],
          },
          areaMetrosCuadrados: 2500,
        },
        {
          nombre: 'Área de Siembra 2',
          coordenadas: {
            type: 'polygon' as const,
            coordinates: [
              { lat: baseLat - 0.0006, lng: baseLng - 0.0008 },
              { lat: baseLat - 0.0006, lng: baseLng - 0.0002 },
              { lat: baseLat - 0.0002, lng: baseLng - 0.0002 },
              { lat: baseLat - 0.0002, lng: baseLng - 0.0008 },
            ],
          },
          areaMetrosCuadrados: 1800,
        },
        {
          nombre: 'Área de Siembra 3',
          coordenadas: {
            type: 'polygon' as const,
            coordinates: [
              { lat: baseLat + 0.0004, lng: baseLng + 0.0005 },
              { lat: baseLat + 0.0004, lng: baseLng + 0.0011 },
              { lat: baseLat + 0.0008, lng: baseLng + 0.0011 },
              { lat: baseLat + 0.0008, lng: baseLng + 0.0005 },
            ],
          },
          areaMetrosCuadrados: 3200,
        },
      ];

      for (const z of zonas) {
        let zona = await this.zonaRepository.findOne({
          where: { nombre: z.nombre },
        });
        if (!zona) {
          zona = this.zonaRepository.create(z);
          await this.zonaRepository.save(zona as any);
          const tipo = z.coordenadas.type === 'point' ? 'punto' : 'polígono';
          this.logger.log(
            `Zona "${z.nombre}" (${tipo}) creada en Tecnoparque Yamboro.`,
            'Seeder',
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error creando zonas: ${error.message}`, 'Seeder');
    }
  }

  private async seedCultivo() {
    this.logger.log(
      'Creando cultivos con mezcla de perennes/transitorios y estados finalizados/activos...',
      'Seeder',
    );
    try {
      // Verificar si ya existen cultivos
      const existingCultivos = await this.cultivoRepository.find();
      if (existingCultivos.length > 0) {
        this.logger.log('Cultivos ya existen. Omitiendo creación.', 'Seeder');
        return;
      }

      const fechasSiembra = [
        '2023-01-15',
        '2023-02-20',
        '2023-03-10',
        '2023-04-05',
        '2023-05-12',
        '2023-06-18',
        '2023-07-25',
        '2023-08-08',
        '2023-09-14',
        '2023-10-22',
        '2023-11-30',
        '2023-12-05',
        '2024-01-10',
        '2024-02-15',
        '2024-03-20',
        '2024-04-25',
        '2024-05-30',
        '2024-06-05',
        '2024-07-10',
        '2024-08-15',
        '2024-09-20',
        '2024-10-25',
        '2024-11-30',
        '2024-12-05',
        '2025-01-10',
        '2025-02-15',
        '2025-03-20',
        '2025-04-25',
        '2025-05-30',
        '2025-06-05',
      ];

      // Obtener fichas disponibles
      const fichas = await this.fichaRepository.find();
      if (fichas.length === 0) {
        this.logger.warn(
          'No hay fichas disponibles para asignar a cultivos',
          'Seeder',
        );
        return;
      }

      const cultivosCreados: any[] = [];

      // Crear cultivos con distribución específica:
      // - 2 cultivos perennes finalizados (con cosechas y ventas completas)
      // - 2 cultivos transitorios finalizados (con cosechas y ventas completas)
      // - 2 cultivos perennes activos (sin cosechas ni ventas)
      // - 2 cultivos transitorios activos (sin cosechas ni ventas)

      const cultivosConfig = [
        // Perennes finalizados
        { tipo: 'perenne', estado: 0, index: 0 }, // Café finalizado
        { tipo: 'perenne', estado: 0, index: 1 }, // Cacao finalizado

        // Transitorios finalizados
        { tipo: 'transitorio', estado: 0, index: 2 }, // Tomate finalizado
        { tipo: 'transitorio', estado: 0, index: 3 }, // Papa finalizado

        // Perennes activos
        { tipo: 'perenne', estado: 1, index: 4 }, // Plátano activo
        { tipo: 'perenne', estado: 1, index: 5 }, // Café activo

        // Transitorios activos
        { tipo: 'transitorio', estado: 1, index: 6 }, // Maíz activo
        { tipo: 'transitorio', estado: 1, index: 7 }, // Tomate activo
      ];

      for (let i = 0; i < cultivosConfig.length; i++) {
        const config = cultivosConfig[i];
        const estado = config.estado;

        const cultivo = this.cultivoRepository.create({
          siembra: new Date(fechasSiembra[i % fechasSiembra.length]),
          estado: estado,
        });
        await this.cultivoRepository.save(cultivo);
        cultivosCreados.push(cultivo);

        const estadoTexto = estado === 1 ? 'En curso' : 'Finalizado';
        const tipoTexto = config.tipo;
        this.logger.log(
          `Cultivo ${i + 1} creado - Tipo: ${tipoTexto}, Estado: ${estadoTexto}`,
          'Seeder',
        );
      }
    } catch (error) {
      this.logger.error(`Error creando cultivos: ${error.message}`, 'Seeder');
    }
  }

  private async seedCultivosXVariedad() {
    this.logger.log(
      'Creando relaciones cultivos x variedad con asignación específica...',
      'Seeder',
    );
    try {
      const cultivos = await this.cultivoRepository.find();
      const variedades = await this.variedadRepository.find({
        relations: ['tipoCultivo'],
      });

      // Separar variedades por tipo de cultivo
      const variedadesPerennes = variedades.filter(
        (v) => v.tipoCultivo?.esPerenne,
      );
      const variedadesTransitorias = variedades.filter(
        (v) => !v.tipoCultivo?.esPerenne,
      );

      // Asignación específica según la configuración de cultivos:
      // 0-1: Perennes finalizados (Café, Cacao)
      // 2-3: Transitorios finalizados (Tomate, Papa)
      // 4-5: Perennes activos (Plátano, Café)
      // 6-7: Transitorios activos (Maíz, Tomate)

      const asignaciones = [
        // Perennes finalizados
        variedadesPerennes.find((v) => v.nombre === 'Caturra') ||
          variedadesPerennes[0],
        variedadesPerennes.find((v) => v.nombre === 'Criollo') ||
          variedadesPerennes[1],
        // Transitorios finalizados
        variedadesTransitorias.find((v) => v.nombre === 'Cherry') ||
          variedadesTransitorias[0],
        variedadesTransitorias.find((v) => v.nombre === 'Criolla') ||
          variedadesTransitorias[1],
        // Perennes activos
        variedadesPerennes.find((v) => v.nombre === 'Cavendish') ||
          variedadesPerennes[2],
        variedadesPerennes.find((v) => v.nombre === 'Catimor') ||
          variedadesPerennes[0],
        // Transitorios activos
        variedadesTransitorias.find((v) => v.nombre === 'Dulce') ||
          variedadesTransitorias[2],
        variedadesTransitorias.find((v) => v.nombre === 'Roma') ||
          variedadesTransitorias[0],
      ];

      for (let i = 0; i < cultivos.length; i++) {
        const variedad = asignaciones[i] || variedades[i % variedades.length];

        const cxv = this.cultivosXVariedadRepository.create({
          fkCultivoId: cultivos[i].id,
          fkVariedadId: variedad.id,
        });
        await this.cultivosXVariedadRepository.save(cxv);

        const tipoTexto = variedad.tipoCultivo?.esPerenne
          ? 'perenne'
          : 'transitorio';
        this.logger.log(
          `Relación cultivo-variedad creada (cultivo ${i + 1}: ${variedad.nombre} - ${tipoTexto}).`,
          'Seeder',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error creando relaciones cultivos x variedad: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedCultivosVariedadXZona() {
    this.logger.log('Creando relaciones cultivos variedad x zona...', 'Seeder');
    try {
      const cxvs = await this.cultivosXVariedadRepository.find();
      const zonas = await this.zonaRepository.find();
      const estadosFenologicos = await this.estadoFenologicoRepository.find();

      // Crear una relación simple: cada cxv con una zona
      for (let i = 0; i < cxvs.length; i++) {
        const cantidadInicial = Math.floor(Math.random() * 100) + 50; // 50-150 plantas iniciales
        const estadoId =
          estadosFenologicos.length > 0 ? estadosFenologicos[0].id : undefined;

        const cvz = this.cultivosVariedadXZonaRepository.create({
          fkCultivosXVariedadId: cxvs[i].id,
          fkZonaId: zonas[i % zonas.length].id,
          cantidadPlantasInicial: cantidadInicial,
          cantidadPlantasActual: cantidadInicial, // Inicialmente igual a la cantidad inicial
          fkEstadoFenologicoId: estadoId,
        });

        const savedCvz = await this.cultivosVariedadXZonaRepository.save(cvz);
        console.log('🌱 CVZ SEEDER - Datos guardados:', {
          id: savedCvz.id,
          cantidadPlantasInicial: savedCvz.cantidadPlantasInicial,
          cantidadPlantasActual: savedCvz.cantidadPlantasActual,
          fkEstadoFenologicoId: savedCvz.fkEstadoFenologicoId,
          fechaActualizacion: savedCvz.fechaActualizacion,
        });

        this.logger.log(
          `Relación cultivo-variedad-zona creada con datos coherentes.`,
          'Seeder',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error creando relaciones cultivos variedad x zona: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedActividad() {
    this.logger.log('Creando actividades base...', 'Seeder');
    try {
      const cvzs = await this.cultivosVariedadXZonaRepository.find();
      const categorias = await this.categoriaActividadRepository.find();
      if (categorias.length === 0) {
        this.logger.warn(
          'Categorías de actividad no encontradas. Saltando creación de actividades.',
          'Seeder',
        );
        return;
      }
      for (const cvz of cvzs) {
        // Verificar si ya existen actividades para este CVZ
        const existingActivities = await this.actividadRepository.find({
          where: { fkCultivoVariedadZonaId: cvz.id },
        });
        if (existingActivities.length > 0) {
          this.logger.log(
            `Actividades ya existen para CVZ ${cvz.id}. Omitiendo.`,
            'Seeder',
          );
          continue;
        }

        // Crear múltiples actividades por CVZ para tener varias ficha trabajando en el mismo cultivo
        for (let i = 0; i < 4; i++) {
          // 4 actividades por CVZ
          const categoria = categorias[i % categorias.length];
          const isFinished = Math.random() > 0.7; // 30% finished
          // Fechas aleatorias en octubre 2024
          const dia = Math.floor(Math.random() * 31) + 1; // 1-31
          const fechaAsignacion = new Date(
            `2025-10-${dia.toString().padStart(2, '0')}`,
          );
          // Get a random user to assign as responsible
          const usuarios = await this.usuarioRepository.find();
          const usuarioResponsable =
            usuarios[Math.floor(Math.random() * usuarios.length)];

          const actividad = this.actividadRepository.create({
            descripcion: `Actividad de ${categoria.nombre}`,
            fechaAsignacion,
            observacion: `Observación de la actividad de ${categoria.nombre}`,
            estado: isFinished ? false : true,
            imgUrl: isFinished ? '/uploads/evidencias/evidence.jpg' : undefined,
            fkCultivoVariedadZonaId: cvz.id,
            fkCategoriaActividadId: categoria.id,
            dniResponsable: usuarioResponsable.dni,
          });
          await this.actividadRepository.save(actividad);
          this.logger.log(
            `Actividad ${categoria.nombre} ${isFinished ? 'finalizada' : 'activa'} creada para CVZ ${cvz.id}.`,
            'Seeder',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creando actividades: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedUsuarioXActividad() {
    this.logger.log(
      'Asignando usuarios de diferentes fichas a actividades del mismo cultivo...',
      'Seeder',
    );
    try {
      const actividades = await this.actividadRepository.find({
        relations: ['cultivoVariedadZona'],
      });
      const fichas = await this.fichaRepository.find({
        relations: ['usuarios'],
      });

      if (fichas.length === 0 || actividades.length === 0) {
        this.logger.warn(
          'No hay fichas con usuarios o actividades disponibles.',
          'Seeder',
        );
        return;
      }

      // Filtrar fichas que tienen usuarios
      const fichasConUsuarios = fichas.filter(
        (f) => f.usuarios && f.usuarios.length > 0,
      );

      if (fichasConUsuarios.length === 0) {
        this.logger.warn('No hay fichas con usuarios asignados.', 'Seeder');
        return;
      }

      // Agrupar actividades por CVZ
      const actividadesPorCvz: { [cvzId: string]: any[] } = {};
      for (const actividad of actividades) {
        const cvzId = actividad.fkCultivoVariedadZonaId;
        if (!actividadesPorCvz[cvzId]) {
          actividadesPorCvz[cvzId] = [];
        }
        actividadesPorCvz[cvzId].push(actividad);
      }

      for (const cvzId of Object.keys(actividadesPorCvz)) {
        const actividadesCvz = actividadesPorCvz[cvzId];
        // Asignar una ficha diferente a cada actividad del mismo CVZ
        const fichasSeleccionadas = this.shuffleArray(fichasConUsuarios).slice(
          0,
          actividadesCvz.length,
        );

        for (let i = 0; i < actividadesCvz.length; i++) {
          const actividad = actividadesCvz[i];
          const ficha = fichasSeleccionadas[i % fichasSeleccionadas.length];

          // Seleccionar un usuario aleatorio de la ficha
          if (ficha.usuarios && ficha.usuarios.length > 0) {
            const usuarioAleatorio = this.shuffleArray(ficha.usuarios)[0];
            const uxa = this.usuarioXActividadRepository.create({
              fkUsuarioId: usuarioAleatorio.id,
              fkActividadId: actividad.id,
              fechaAsignacion: new Date().toISOString().split('T')[0], // YYYY-MM-DD
              activo: true,
            });
            await this.usuarioXActividadRepository.save(uxa);
            this.logger.log(
              `Usuario ${usuarioAleatorio.nombres} (Ficha ${ficha.numero}) asignado a actividad ${actividad.id} en CVZ ${cvzId}.`,
              'Seeder',
            );
          }
        }
      }
      this.logger.log(`Asignaciones usuario-actividad completadas.`, 'Seeder');
    } catch (error) {
      this.logger.error(
        `Error creando relaciones usuario x actividad: ${error.message}`,
        'Seeder',
      );
    }
  }

  // Método auxiliar para mezclar array
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async seedCosechas() {
    this.logger.log(
      'Creando cosechas para cultivos finalizados (cerradas) y activos (abiertas)...',
      'Seeder',
    );
    try {
      // Obtener CVZ con relaciones para todos los cultivos
      const cvzs = await this.cultivosVariedadXZonaRepository.find({
        relations: [
          'cultivoXVariedad',
          'cultivoXVariedad.cultivo',
          'cultivoXVariedad.variedad',
          'cultivoXVariedad.variedad.tipoCultivo',
        ],
      });

      if (cvzs.length === 0) {
        this.logger.warn(
          'No hay CVZ disponibles para crear cosechas.',
          'Seeder',
        );
        return;
      }

      // Separar CVZ por estado del cultivo
      const cvzsFinalizados = cvzs.filter(
        (cvz) => cvz.cultivoXVariedad?.cultivo?.estado === 0,
      );
      const cvzsActivos = cvzs.filter(
        (cvz) => cvz.cultivoXVariedad?.cultivo?.estado === 1,
      );

      // Crear cosechas CERRADAS para cultivos finalizados
      for (let i = 0; i < cvzsFinalizados.length; i++) {
        const cvz = cvzsFinalizados[i];
        const cultivo = cvz.cultivoXVariedad?.cultivo;
        const tipoCultivo = cvz.cultivoXVariedad?.variedad?.tipoCultivo;

        // Generar fecha de cosecha anterior a la fecha actual (para cultivos finalizados)
        let fechaCosecha: Date;
        if (cultivo?.siembra) {
          const siembra = new Date(cultivo.siembra);
          const hoy = new Date();
          const diffTime = hoy.getTime() - siembra.getTime();
          // Fecha de cosecha entre siembra y hace 30 días (para que esté finalizada)
          const randomTime =
            Math.random() * (diffTime - 30 * 24 * 60 * 60 * 1000);
          fechaCosecha = new Date(siembra.getTime() + randomTime);
        } else {
          fechaCosecha = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 días atrás
        }

        const cosecha = this.cosechaRepository.create({
          unidadMedida: 'kg',
          cantidad: Math.floor(Math.random() * 200) + 100, // Cantidad mayor para cosechas completas: 100-300 kg
          fecha: fechaCosecha.toISOString().split('T')[0],
          fkCultivosVariedadXZonaId: cvz.id,
          cerrado: true, // Cosechas de cultivos finalizados están CERRADAS
        });
        await this.cosechaRepository.save(cosecha);

        const tipoTexto = tipoCultivo?.esPerenne ? 'perenne' : 'transitorio';
        this.logger.log(
          `Cosecha CERRADA creada para cultivo ${tipoTexto} finalizado (CVZ ${cvz.id}), fecha: ${cosecha.fecha}, cantidad: ${cosecha.cantidad}kg.`,
          'Seeder',
        );
      }

      // Crear cosechas ABIERTAS para cultivos activos (solo para cultivos transitorios activos)
      const cvzsActivosTransitorios = cvzsActivos.filter(
        (cvz) => !cvz.cultivoXVariedad?.variedad?.tipoCultivo?.esPerenne,
      );

      for (let i = 0; i < cvzsActivosTransitorios.length; i++) {
        const cvz = cvzsActivosTransitorios[i];
        const cultivo = cvz.cultivoXVariedad?.cultivo;
        const tipoCultivo = cvz.cultivoXVariedad?.variedad?.tipoCultivo;

        // Generar fecha variada: desde la fecha de siembra hasta hoy
        let fechaCosecha: Date;
        if (cultivo?.siembra) {
          const siembra = new Date(cultivo.siembra);
          const hoy = new Date();
          const diffTime = hoy.getTime() - siembra.getTime();
          const randomTime = Math.random() * diffTime;
          fechaCosecha = new Date(siembra.getTime() + randomTime);
        } else {
          fechaCosecha = new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          );
        }

        const cosecha = this.cosechaRepository.create({
          unidadMedida: 'kg',
          cantidad: Math.floor(Math.random() * 150) + 50, // Cantidad menor para cosechas activas: 50-200 kg
          fecha: fechaCosecha.toISOString().split('T')[0],
          fkCultivosVariedadXZonaId: cvz.id,
          cerrado: false, // Cosechas de cultivos activos están ABIERTAS
        });
        await this.cosechaRepository.save(cosecha);

        const tipoTexto = tipoCultivo?.esPerenne ? 'perenne' : 'transitorio';
        this.logger.log(
          `Cosecha ABIERTA creada para cultivo ${tipoTexto} activo (CVZ ${cvz.id}), fecha: ${cosecha.fecha}, cantidad: ${cosecha.cantidad}kg.`,
          'Seeder',
        );
      }

      this.logger.log(
        `Creadas ${cvzsFinalizados.length} cosechas cerradas para cultivos finalizados y ${cvzsActivosTransitorios.length} cosechas abiertas para cultivos activos.`,
        'Seeder',
      );
    } catch (error) {
      this.logger.error(`Error creando cosechas: ${error.message}`, 'Seeder');
    }
  }

  private async seedEstadosFenologicos() {
    this.logger.log('Creando estados fenológicos base...', 'Seeder');
    try {
      const estados = [
        {
          nombre: 'Germinación',
          descripcion: 'Fase inicial de crecimiento de la semilla',
          orden: 1,
        },
        {
          nombre: 'Crecimiento Vegetativo',
          descripcion: 'Desarrollo de raíces, tallos y hojas',
          orden: 2,
        },
        {
          nombre: 'Floración',
          descripcion: 'Aparición de flores en la planta',
          orden: 3,
        },
        {
          nombre: 'Fructificación',
          descripcion: 'Formación y desarrollo de frutos',
          orden: 4,
        },
        {
          nombre: 'Maduración',
          descripcion: 'Frutos alcanzan su punto óptimo de cosecha',
          orden: 5,
        },
        {
          nombre: 'Senescencia',
          descripcion: 'Envejecimiento y finalización del ciclo',
          orden: 6,
        },
      ];
      for (const estado of estados) {
        let estadoFenologico = await this.estadoFenologicoRepository.findOne({
          where: { nombre: estado.nombre },
        });
        if (!estadoFenologico) {
          estadoFenologico = this.estadoFenologicoRepository.create(estado);
          await this.estadoFenologicoRepository.save(estadoFenologico);
          this.logger.log(
            `Estado fenológico "${estado.nombre}" creado.`,
            'Seeder',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creando estados fenológicos: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedCategoriaActividad() {
    this.logger.log('Creando categorías de actividad base...', 'Seeder');
    try {
      const categorias = [
        'Siembra',
        'Cosecha',
        'Congelación',
        'Fitosanitario',
        'Mantenimiento',
        'Herramientas',
        'observación',
      ];
      for (const nombre of categorias) {
        let categoria = await this.categoriaActividadRepository.findOne({
          where: { nombre },
        });
        if (!categoria) {
          categoria = this.categoriaActividadRepository.create({ nombre });
          await this.categoriaActividadRepository.save(categoria);
          this.logger.log(
            `Categoría de actividad "${nombre}" creada.`,
            'Seeder',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creando categorías de actividad: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedUnidadesMedida() {
    this.logger.log('Creando unidades de medida base...', 'Seeder');
    try {
      const unidades = [
        { nombre: 'Kilogramo', abreviatura: 'kg' },
        { nombre: 'Gramo', abreviatura: 'g' },
        { nombre: 'Litro', abreviatura: 'L' },
        { nombre: 'Mililitro', abreviatura: 'mL' },
        { nombre: 'Unidad', abreviatura: 'u' },
        { nombre: 'Metro', abreviatura: 'm' },
        { nombre: 'Centímetro', abreviatura: 'cm' },
      ];

      for (const unidad of unidades) {
        let existing = await this.unidadMedidaRepository.findOne({
          where: { nombre: unidad.nombre },
        });
        if (!existing) {
          existing = this.unidadMedidaRepository.create(unidad);
          await this.unidadMedidaRepository.save(existing);
          this.logger.log(
            `Unidad de medida "${unidad.nombre}" creada.`,
            'Seeder',
          );
        }
      }

      this.logger.log('Unidades de medida base creadas/verificados.', 'Seeder');
    } catch (error) {
      this.logger.error(
        `Error creando unidades de medida: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedProductos() {
    this.logger.log('Creando productos base...', 'Seeder');
    try {
      const categorias = await this.categoriaRepository.find();
      const unidades = await this.unidadMedidaRepository.find();

      const productos = [
        {
          nombre: 'Fertilizante Nitrogenado',
          descripcion: 'Fertilizante rico en nitrógeno para cultivos',
          sku: 'FERT-N-001',
          precioCompra: 120000,
          capacidadPresentacion: 25.0,
          categoriaNombre: 'Nutrición y Suelo',
          unidadNombre: 'Kilogramo',
        },
        {
          nombre: 'Semillas de Maíz Híbrido',
          descripcion: 'Semillas de maíz híbrido de alta calidad',
          sku: 'SEM-MZ-001',
          precioCompra: 60000,
          capacidadPresentacion: 25.0,
          categoriaNombre: 'Material de Propagación',
          unidadNombre: 'Kilogramo',
        },
        {
          nombre: 'Pesticida Orgánico',
          descripcion: 'Pesticida natural para control de plagas',
          sku: 'PEST-ORG-001',
          precioCompra: 150000,
          capacidadPresentacion: 5.0,
          categoriaNombre: 'Sanidad Vegetal',
          unidadNombre: 'Litro',
        },
        {
          nombre: 'Herramienta de Siembra',
          descripcion: 'Herramienta manual para siembra precisa',
          sku: 'HERR-SIEM-001',
          precioCompra: 180000,
          capacidadPresentacion: 1.0,
          categoriaNombre: 'Equipo y Herramientas',
          unidadNombre: 'Unidad',
          vidaUtilPromedioPorUsos: 800,
        },
        {
          nombre: 'Pala',
          descripcion: 'Pala resistente para excavación y movimiento de tierra',
          sku: 'HERR-PALA-001',
          precioCompra: 100000,
          capacidadPresentacion: 1.0,
          categoriaNombre: 'Equipo y Herramientas',
          unidadNombre: 'Unidad',
          vidaUtilPromedioPorUsos: 1200,
        },
        {
          nombre: 'Carretilla',
          descripcion: 'Carretilla metálica para transporte de materiales',
          sku: 'HERR-CARR-001',
          precioCompra: 320000,
          capacidadPresentacion: 1.0,
          categoriaNombre: 'Equipo y Herramientas',
          unidadNombre: 'Unidad',
          vidaUtilPromedioPorUsos: 2000,
        },
        {
          nombre: 'Rastrillo',
          descripcion:
            'Rastrillo para nivelación del suelo y recolección de residuos',
          sku: 'HERR-RAST-001',
          precioCompra: 60000,
          capacidadPresentacion: 1.0,
          categoriaNombre: 'Equipo y Herramientas',
          unidadNombre: 'Unidad',
          vidaUtilPromedioPorUsos: 600,
        },
        {
          nombre: 'Azadón',
          descripcion: 'Azadón para labranza y preparación del suelo',
          sku: 'HERR-AZAD-001',
          precioCompra: 120000,
          capacidadPresentacion: 1.0,
          categoriaNombre: 'Equipo y Herramientas',
          unidadNombre: 'Unidad',
          vidaUtilPromedioPorUsos: 1000,
        },
        {
          nombre: 'Guantes de Trabajo',
          descripcion: 'Par de guantes resistentes para protección manual',
          sku: 'HERR-GUAN-001',
          precioCompra: 35000,
          capacidadPresentacion: 1.0,
          categoriaNombre: 'Suministros Auxiliares',
          unidadNombre: 'Unidad',
          vidaUtilPromedioPorUsos: 150,
        },
        {
          nombre: 'Machete',
          descripcion: 'Machete afilado para corte de vegetación',
          sku: 'HERR-MACH-001',
          precioCompra: 80000,
          capacidadPresentacion: 1.0,
          categoriaNombre: 'Equipo y Herramientas',
          unidadNombre: 'Unidad',
          vidaUtilPromedioPorUsos: 500,
        },
        {
          nombre: 'Semillas de Cacao',
          descripcion: 'Semillas de cacao criollo de alta calidad',
          sku: 'SEM-CAC-001',
          precioCompra: 80000,
          capacidadPresentacion: 25.0,
          categoriaNombre: 'Material de Propagación',
          unidadNombre: 'Kilogramo',
        },
      ];

      for (const prodData of productos) {
        let existing = await this.productoRepository.findOne({
          where: { nombre: prodData.nombre },
        });
        if (!existing) {
          const categoria = categorias.find(
            (c) => c.nombre === prodData.categoriaNombre,
          );
          const unidad = unidades.find(
            (u) => u.nombre === prodData.unidadNombre,
          );

          if (categoria && unidad) {
            existing = this.productoRepository.create({
              nombre: prodData.nombre,
              descripcion: prodData.descripcion,
              sku: prodData.sku,
              precioCompra: prodData.precioCompra,
              capacidadPresentacion: prodData.capacidadPresentacion,
              fkCategoriaId: categoria.id,
              fkUnidadMedidaId: unidad.id,
              vidaUtilPromedioPorUsos: prodData.vidaUtilPromedioPorUsos,
            });
            await this.productoRepository.save(existing);
            this.logger.log(`Producto "${prodData.nombre}" creado.`, 'Seeder');
          }
        }
      }

      this.logger.log('Productos base creados/verificados.', 'Seeder');
    } catch (error) {
      this.logger.error(`Error creando productos: ${error.message}`, 'Seeder');
    }
  }

  private async seedLotesInventario() {
    this.logger.log('Creando lotes de inventario base...', 'Seeder');
    try {
      const productos = await this.productoRepository.find({
        relations: ['categoria'],
      });
      const bodega = await this.bodegaRepository.findOne({
        where: { nombre: 'Bodega Principal' },
      });

      if (!bodega) {
        this.logger.warn(
          'Bodega Principal no encontrada. Saltando creación de lotes.',
          'Seeder',
        );
        return;
      }

      const lotes = [
        {
          productoNombre: 'Fertilizante Nitrogenado',
          cantidadDisponible: 125.0,
          cantidadParcial: 0.0,
          stock: 25,
          esParcial: false,
          fechaVencimiento: new Date('2026-12-31'),
        },
        {
          productoNombre: 'Semillas de Maíz Híbrido',
          cantidadDisponible: 250.0,
          cantidadParcial: 0.0,
          stock: 10,
          esParcial: false,
          fechaVencimiento: new Date('2026-06-30'),
        },
        {
          productoNombre: 'Pesticida Orgánico',
          cantidadDisponible: 100.0,
          cantidadParcial: 15.0,
          stock: 20,
          esParcial: true,
          fechaVencimiento: new Date('2026-08-15'),
        },
        {
          productoNombre: 'Herramienta de Siembra',
          cantidadDisponible: 5.0,
          cantidadParcial: 0.0,
          stock: 5,
          esParcial: false,
          fechaVencimiento: undefined,
        },
        {
          productoNombre: 'Pala',
          cantidadDisponible: 10.0,
          cantidadParcial: 0.0,
          stock: 10,
          esParcial: false,
          fechaVencimiento: undefined,
        },
        {
          productoNombre: 'Carretilla',
          cantidadDisponible: 20.0,
          cantidadParcial: 0.0,
          stock: 20,
          esParcial: false,
          fechaVencimiento: undefined,
        },
        {
          productoNombre: 'Rastrillo',
          cantidadDisponible: 5.0,
          cantidadReservada: 0.0,
          cantidadParcial: 0.0,
          stock: 5,
          esParcial: false,
          fechaVencimiento: undefined,
        },
        {
          productoNombre: 'Azadón',
          cantidadDisponible: 10.0,
          cantidadReservada: 0.0,
          cantidadParcial: 0.0,
          stock: 10,
          esParcial: false,
          fechaVencimiento: undefined,
        },
        {
          productoNombre: 'Guantes de Trabajo',
          cantidadDisponible: 20.0,
          cantidadReservada: 0.0,
          cantidadParcial: 5.0,
          stock: 25,
          esParcial: false,
          fechaVencimiento: undefined,
        },
        {
          productoNombre: 'Machete',
          cantidadDisponible: 5.0,
          cantidadReservada: 0.0,
          cantidadParcial: 0.0,
          stock: 5,
          esParcial: false,
          fechaVencimiento: undefined,
        },
      ];

      for (const loteData of lotes) {
        const producto = productos.find(
          (p) => p.nombre === loteData.productoNombre,
        );
        if (producto) {
          const lote = this.lotesInventarioRepository.create({
            fkProductoId: producto.id,
            fkBodegaId: bodega.id,
            cantidadDisponible: loteData.cantidadDisponible,
            cantidadReservada: loteData.cantidadReservada,
            cantidadParcial: loteData.cantidadParcial,
            stock: loteData.stock,
            esParcial: loteData.esParcial,
            fechaIngreso: new Date(),
            fechaVencimiento: loteData.fechaVencimiento,
          } as any);
          await this.lotesInventarioRepository.save(lote);
          this.logger.log(
            `Lote para "${loteData.productoNombre}" creado.`,
            'Seeder',
          );
        }
      }

      this.logger.log('Lotes de inventario base creados.', 'Seeder');
    } catch (error) {
      this.logger.error(
        `Error creando lotes de inventario: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedTiposMovimiento() {
    this.logger.log('Creando tipos de movimiento base...', 'Seeder');
    try {
      const tipos = [
        { nombre: 'Entrada' },
        { nombre: 'Salida' },
        { nombre: 'Reserva' },
        { nombre: 'Devolución' },
        { nombre: 'Ajuste' },
      ];

      for (const tipo of tipos) {
        let existing = await this.tipoMovimientoRepository.findOne({
          where: { nombre: tipo.nombre },
        });
        if (!existing) {
          existing = this.tipoMovimientoRepository.create(tipo);
          await this.tipoMovimientoRepository.save(existing);
          this.logger.log(
            `Tipo de movimiento "${tipo.nombre}" creado.`,
            'Seeder',
          );
        }
      }

      this.logger.log(
        'Tipos de movimiento base creados/verificados.',
        'Seeder',
      );
    } catch (error) {
      this.logger.error(
        `Error creando tipos de movimiento: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedEstadosReserva() {
    this.logger.log('Creando estados de reserva base...', 'Seeder');
    try {
      const estados = [
        { nombre: 'Pendiente' },
        { nombre: 'Confirmada' },
        { nombre: 'En Uso' },
        { nombre: 'Completada' },
        { nombre: 'Cancelada' },
      ];

      for (const estado of estados) {
        let existing = await this.estadoReservaRepository.findOne({
          where: { nombre: estado.nombre },
        });
        if (!existing) {
          existing = this.estadoReservaRepository.create(estado);
          await this.estadoReservaRepository.save(existing);
          this.logger.log(
            `Estado de reserva "${estado.nombre}" creado.`,
            'Seeder',
          );
        }
      }

      this.logger.log('Estados de reserva base creados/verificados.', 'Seeder');
    } catch (error) {
      this.logger.error(
        `Error creando estados de reserva: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedReservasXActividad() {
    this.logger.log(
      'Creando reservas por actividad con datos financieros inmutables...',
      'Seeder',
    );
    try {
      const actividades = await this.actividadRepository.find();
      const lotes = await this.lotesInventarioRepository.find({
        relations: ['producto'],
      });
      const estados = await this.estadoReservaRepository.find();

      if (
        actividades.length === 0 ||
        lotes.length === 0 ||
        estados.length === 0
      ) {
        this.logger.warn(
          'No hay actividades, lotes o estados suficientes. Saltando reservas.',
          'Seeder',
        );
        return;
      }

      const estadoConfirmada = estados.find((e) => e.nombre === 'Confirmada');
      const estadoEnUso = estados.find((e) => e.nombre === 'En Uso');

      if (!estadoConfirmada || !estadoEnUso) {
        this.logger.warn(
          'Estados requeridos no encontrados. Saltando reservas.',
          'Seeder',
        );
        return;
      }

      // Crear reservas con datos financieros inmutables para testing
      const reservasData = [
        {
          actividadIndex: 0,
          loteIndex: 0,
          estado: estadoConfirmada,
          cantidadReservada: 10.0,
          cantidadUsada: 8.0, // Usado para cálculos financieros
          cantidadDevuelta: 2.0,
        },
        {
          actividadIndex: 1,
          loteIndex: 1,
          estado: estadoEnUso,
          cantidadReservada: 5.0,
          cantidadUsada: 3.0,
          cantidadDevuelta: null,
        },
        {
          actividadIndex: 2,
          loteIndex: 2,
          estado: estadoConfirmada,
          cantidadReservada: 2.0,
          cantidadUsada: 1.5,
          cantidadDevuelta: 0.5,
        },
        {
          actividadIndex: 3,
          loteIndex: 3,
          estado: estadoConfirmada,
          cantidadReservada: 15.0,
          cantidadUsada: 12.0,
          cantidadDevuelta: 3.0,
        },
        {
          actividadIndex: 4,
          loteIndex: 4,
          estado: estadoEnUso,
          cantidadReservada: 8.0,
          cantidadUsada: 6.0,
          cantidadDevuelta: null,
        },
      ];

      for (const resData of reservasData) {
        const actividad =
          actividades[resData.actividadIndex % actividades.length];
        const lote = lotes[resData.loteIndex % lotes.length];

        if (actividad && lote && lote.producto) {
          // Copiar datos financieros inmutables del producto
          const reserva = this.reservasXActividadRepository.create({
            fkActividadId: actividad.id,
            fkLoteId: lote.id,
            fkEstadoId: resData.estado.id,
            cantidadReservada: resData.cantidadReservada,
            cantidadUsada: resData.cantidadUsada,
            cantidadDevuelta: resData.cantidadDevuelta,
            capacidadPresentacionProducto: lote.producto.capacidadPresentacion,
            precioProducto: lote.producto.precioCompra,
          } as any);
          await this.reservasXActividadRepository.save(reserva);

          // Calcular costo financiero para logging
          const costoInventario = resData.cantidadUsada
            ? (resData.cantidadUsada * lote.producto.precioCompra) /
              lote.producto.capacidadPresentacion
            : 0;

          this.logger.log(
            `Reserva financiera creada - Actividad: ${actividad.id}, Lote: ${lote.id}, ` +
              `Producto: ${lote.producto.nombre}, Costo: $${costoInventario.toFixed(2)}`,
            'Seeder',
          );
        }
      }

      this.logger.log(
        'Reservas por actividad con datos financieros creadas.',
        'Seeder',
      );
    } catch (error) {
      this.logger.error(
        `Error creando reservas por actividad: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedMovimientosInventario() {
    this.logger.log('Creando movimientos de inventario...', 'Seeder');
    try {
      const lotes = await this.lotesInventarioRepository.find({
        relations: ['producto'],
      });
      const reservas = await this.reservasXActividadRepository.find();
      const tiposMovimiento = await this.tipoMovimientoRepository.find();

      if (lotes.length === 0 || tiposMovimiento.length === 0) {
        this.logger.warn(
          'No hay lotes o tipos de movimiento. Saltando movimientos.',
          'Seeder',
        );
        return;
      }

      const tipoEntrada = tiposMovimiento.find((t) => t.nombre === 'Entrada');
      const tipoReserva = tiposMovimiento.find((t) => t.nombre === 'Reserva');
      const tipoSalida = tiposMovimiento.find((t) => t.nombre === 'Salida');

      // Movimientos de entrada iniciales
      for (const lote of lotes) {
        if (tipoEntrada) {
          const movimiento = this.movimientosInventarioRepository.create({
            fkLoteId: lote.id,
            fkTipoMovimientoId: tipoEntrada.id,
            cantidad: lote.cantidadDisponible,
            fechaMovimiento: lote.fechaIngreso,
            observacion: 'Entrada inicial de inventario',
          });
          await this.movimientosInventarioRepository.save(movimiento);
          this.logger.log(
            `Movimiento de entrada para lote ${lote.id} creado.`,
            'Seeder',
          );
        }
      }

      // Movimientos de reserva
      for (const reserva of reservas) {
        if (tipoReserva) {
          const movimiento = this.movimientosInventarioRepository.create({
            fkLoteId: reserva.fkLoteId,
            fkReservaId: reserva.id,
            fkTipoMovimientoId: tipoReserva.id,
            cantidad: reserva.cantidadReservada,
            observacion: 'Reserva para actividad',
          });
          await this.movimientosInventarioRepository.save(movimiento);
          this.logger.log(
            `Movimiento de reserva para reserva ${reserva.id} creado.`,
            'Seeder',
          );
        }

        // Si hay cantidad usada, crear movimiento de salida
        if (reserva.cantidadUsada && tipoSalida) {
          const movimientoSalida = this.movimientosInventarioRepository.create({
            fkLoteId: reserva.fkLoteId,
            fkReservaId: reserva.id,
            fkTipoMovimientoId: tipoSalida.id,
            cantidad: reserva.cantidadUsada,
            observacion: 'Salida por uso en actividad',
          });
          await this.movimientosInventarioRepository.save(movimientoSalida);
          this.logger.log(
            `Movimiento de salida para reserva ${reserva.id} creado.`,
            'Seeder',
          );
        }
      }

      this.logger.log('Movimientos de inventario creados.', 'Seeder');
    } catch (error) {
      this.logger.error(
        `Error creando movimientos de inventario: ${error.message}`,
        'Seeder',
      );
    }
  }

  private async seedVentas() {
    this.logger.log(
      'Creando ventas con conversión de unidades para testing financiero...',
      'Seeder',
    );
    try {
      // Obtener solo cosechas cerradas (cerrado = true) de cultivos finalizados para ventas completas
      const cosechasCerradas = await this.cosechaRepository.find({
        where: { cerrado: true },
        relations: [
          'cultivosVariedadXZona',
          'cultivosVariedadXZona.cultivoXVariedad',
          'cultivosVariedadXZona.cultivoXVariedad.cultivo',
          'cultivosVariedadXZona.cultivoXVariedad.variedad',
          'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
        ],
      });

      // Filtrar cosechas que pertenecen a cultivos finalizados (estado = 0)
      const cosechasFinalizadas = cosechasCerradas.filter(
        (cosecha) =>
          cosecha.cultivosVariedadXZona?.cultivoXVariedad?.cultivo?.estado ===
          0,
      );

      if (cosechasFinalizadas.length === 0) {
        this.logger.warn(
          'No hay cosechas cerradas de cultivos finalizados disponibles para ventas. Saltando ventas.',
          'Seeder',
        );
        return;
      }

      // Crear ventas con diferentes unidades para testing de conversión
      const ventasData = [
        {
          cosechaIndex: 0,
          cantidad: 50,
          unidadMedida: 'kg',
          precioUnitario: 2500,
        }, // $25/kg
        {
          cosechaIndex: 1,
          cantidad: 110.23,
          unidadMedida: 'lb',
          precioUnitario: 1136.36,
        }, // Equivale a $25/kg
        {
          cosechaIndex: 0,
          cantidad: 25,
          unidadMedida: 'kg',
          precioUnitario: 3000,
        }, // $30/kg
        {
          cosechaIndex: 1,
          cantidad: 55.12,
          unidadMedida: 'lb',
          precioUnitario: 1363.64,
        }, // Equivale a $30/kg
      ];

      for (let i = 0; i < ventasData.length; i++) {
        const ventaData = ventasData[i];
        const cosecha =
          cosechasFinalizadas[
            ventaData.cosechaIndex % cosechasFinalizadas.length
          ];

        if (!cosecha) continue;

        const tipoCultivo =
          cosecha.cultivosVariedadXZona?.cultivoXVariedad?.variedad
            ?.tipoCultivo;

        // Calcular cantidad disponible
        const cantidadVendida =
          cosecha.cosechasVentas?.reduce(
            (total, cv) => total + cv.cantidadVendida,
            0,
          ) || 0;
        const cantidadDisponible = cosecha.cantidad - cantidadVendida;

        if (cantidadDisponible <= 0) {
          this.logger.log(
            `Cosecha ${cosecha.id} ya completamente vendida. Saltando.`,
            'Seeder',
          );
          continue;
        }

        // Limitar la venta a la cantidad disponible
        const cantidadAVender = Math.min(
          ventaData.cantidad,
          cantidadDisponible,
        );

        // Generar fecha de venta posterior a la fecha de cosecha
        const fechaCosecha = new Date(cosecha.fecha || Date.now());
        const diasDespues = Math.floor(Math.random() * 30) + 1;
        const fechaVenta = new Date(
          fechaCosecha.getTime() + diasDespues * 24 * 60 * 60 * 1000,
        );

        // Calcular precio por kilo (siempre en $/kg para análisis financiero)
        const precioKilo =
          ventaData.unidadMedida === 'kg'
            ? ventaData.precioUnitario
            : ventaData.precioUnitario / 0.453592; // Convertir lb a kg

        // Crear la venta con campos de conversión
        const venta = this.ventaRepository.create({
          cantidad: cantidadAVender,
          fecha: fechaVenta.toISOString().split('T')[0],
          unidadMedida: ventaData.unidadMedida,
          precioUnitario: ventaData.precioUnitario,
          precioKilo: Math.round(precioKilo * 100) / 100, // Siempre en $/kg
          fkCosechaId: cosecha.id,
        });

        const savedVenta = await this.ventaRepository.save(venta);

        // Crear relación cosecha-venta
        const cosechasVentas = this.cosechasVentasRepository.create({
          fkCosechaId: cosecha.id,
          fkVentaId: savedVenta.id,
          cantidadVendida: cantidadAVender,
        });

        await this.cosechasVentasRepository.save(cosechasVentas);

        const tipoTexto = tipoCultivo?.esPerenne ? 'perenne' : 'transitorio';
        const ingresoTotal = cantidadAVender * precioKilo;

        this.logger.log(
          `Venta financiera creada - Cosecha: ${cosecha.id}, Cantidad: ${cantidadAVender}${ventaData.unidadMedida}, ` +
            `Precio unitario: $${ventaData.precioUnitario}/${ventaData.unidadMedida}, ` +
            `Precio/kg: $${precioKilo.toFixed(2)}, Ingreso: $${ingresoTotal.toFixed(2)}`,
          'Seeder',
        );
      }

      this.logger.log(
        `Ventas con conversión de unidades creadas para testing financiero.`,
        'Seeder',
      );
    } catch (error) {
      this.logger.error(`Error creando ventas: ${error.message}`, 'Seeder');
    }
  }

  private async seedMqttConfigs() {
    this.logger.log(
      'Creando configuraciones MQTT predeterminadas...',
      'Seeder',
    );
    try {
      const mqttConfigsData = [
        {
          nombre: 'Config Temperatura',
          host: 'test.mosquitto.org',
          port: 1883,
          protocol: 'mqtt',
          topicBase: 'agrotic/sensores/temperatura',
          activa: true,
        },
        {
          nombre: 'Config Humedad',
          host: 'test.mosquitto.org',
          port: 1883,
          protocol: 'mqtt',
          topicBase: 'agrotic/sensores/humedad',
          activa: true,
        },
        {
          nombre: 'Config Gas MQ4',
          host: 'test.mosquitto.org',
          port: 1883,
          protocol: 'mqtt',
          topicBase: 'agrotic/sensores/gas_mq4',
          activa: true,
        },
        {
          nombre: 'Config Luz LDR',
          host: 'test.mosquitto.org',
          port: 1883,
          protocol: 'mqtt',
          topicBase: 'agrotic/sensores/luz_ldr',
          activa: true,
        },
      ];

      for (const configData of mqttConfigsData) {
        let mqttConfig = await this.mqttConfigRepository.findOne({
          where: { nombre: configData.nombre },
        });

        if (!mqttConfig) {
          mqttConfig = this.mqttConfigRepository.create(configData);
          await this.mqttConfigRepository.save(mqttConfig);
          this.logger.log(
            `Configuración MQTT "${configData.nombre}" creada.`,
            'Seeder',
          );
        } else {
          this.logger.log(
            `Configuración MQTT "${configData.nombre}" ya existe. Omitiendo.`,
            'Seeder',
          );
        }
      }

      this.logger.log(
        'Configuraciones MQTT predeterminadas creadas/verificados.',
        'Seeder',
      );
    } catch (error) {
      this.logger.error(
        `Error creando configuraciones MQTT: ${error.message}`,
        'Seeder',
      );
    }
  }
}
