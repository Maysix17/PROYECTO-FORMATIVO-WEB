import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Actividad } from './entities/actividades.entity';
import { CreateActividadeDto } from './dto/create-actividade.dto';
import { UpdateActividadeDto } from './dto/update-actividade.dto';
import { ReservasXActividadService } from '../reservas_x_actividad/reservas_x_actividad.service';
import { CreateReservasXActividadDto } from '../reservas_x_actividad/dto/create-reservas_x_actividad.dto';
import { ReservasXActividad } from '../reservas_x_actividad/entities/reservas_x_actividad.entity';
import { LotesInventario } from '../lotes_inventario/entities/lotes_inventario.entity';
import { MovimientosInventarioService } from '../movimientos_inventario/movimientos_inventario.service';
import { CreateMovimientosInventarioDto } from '../movimientos_inventario/dto/create-movimientos_inventario.dto';

@Injectable()
export class ActividadesService {
  constructor(
    @InjectRepository(Actividad)
    private readonly actividadesRepo: Repository<Actividad>,
    @InjectRepository(ReservasXActividad)
    private readonly reservasXActividadRepo: Repository<ReservasXActividad>,
    private readonly reservasXActividadService: ReservasXActividadService,
    private readonly movimientosInventarioService: MovimientosInventarioService,
  ) {}

  async create(
    dto: CreateActividadeDto & { imgUrl: string },
    dniResponsable: number,
  ): Promise<Actividad> {
    console.log('ActividadesService create - dniResponsable:', dniResponsable);
    console.log(
      'ActividadesService create - dto.fechaAsignacion:',
      dto.fechaAsignacion,
    );
    console.log(
      'ActividadesService create - dto.fechaAsignacion type:',
      typeof dto.fechaAsignacion,
    );
    console.log(
      'ActividadesService create - dto.fechaAsignacion ISO:',
      dto.fechaAsignacion.toISOString(),
    );
    console.log(
      'ActividadesService create - dto.fechaAsignacion local:',
      dto.fechaAsignacion.toLocaleDateString(),
    );

    const actividad: Actividad = this.actividadesRepo.create({
      ...dto,
      dniResponsable,
    });
    console.log(
      'ActividadesService create - actividad.fechaAsignacion after create:',
      actividad.fechaAsignacion,
    );
    console.log(
      'ActividadesService create - actividad.fechaAsignacion ISO after create:',
      actividad.fechaAsignacion.toISOString(),
    );

    const saved = await this.actividadesRepo.save(actividad);
    console.log(
      'ActividadesService create - saved.fechaAsignacion:',
      saved.fechaAsignacion,
    );
    console.log(
      'ActividadesService create - saved.fechaAsignacion ISO:',
      saved.fechaAsignacion.toISOString(),
    );

    return saved;
  }
  async findAll(): Promise<Actividad[]> {
    return await this.actividadesRepo.find();
  }

  async countByDate(date: string): Promise<number> {
    return await this.actividadesRepo.count({
      where: { fechaAsignacion: new Date(date), estado: true },
    });
  }

  async findByDate(date: string): Promise<Actividad[]> {
    const actividades = await this.actividadesRepo.find({
      where: { fechaAsignacion: new Date(date), estado: true },
      relations: [
        'categoriaActividad',
        'cultivoVariedadZona',
        'cultivoVariedadZona.cultivoXVariedad',
        'cultivoVariedadZona.cultivoXVariedad.cultivo',
        'cultivoVariedadZona.cultivoXVariedad.variedad',
        'cultivoVariedadZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivoVariedadZona.zona',
        'usuariosAsignados',
        'usuariosAsignados.usuario',
        'usuariosAsignados.usuario.ficha',
        'reservas',
        'reservas.lote',
        'reservas.lote.producto',
        'reservas.lote.producto.unidadMedida',
        'reservas.estado',
      ],
    });

    // Enrich with responsable information
    return await this.enrichActividadesWithResponsable(actividades);
  }

  async findByDateWithActive(date: string): Promise<Actividad[]> {
    const actividades = await this.findByDate(date);
    // Filter relations to only active
    const filtered = actividades.map((act) => ({
      ...act,
      usuariosAsignados:
        act.usuariosAsignados?.filter((u) => u.activo !== false) || [],
      reservas: act.reservas?.filter((r) => r.estado?.id === 1) || [], // Assuming 1 is 'Reservado' or active state
    }));

    // Re-enrich with responsable information after filtering
    return await this.enrichActividadesWithResponsable(filtered);
  }

  async findByDateRange(start: string, end: string): Promise<Actividad[]> {
    const actividades = await this.actividadesRepo.find({
      where: {
        fechaAsignacion: Between(new Date(start), new Date(end)),
        estado: true,
      },
      relations: [
        'categoriaActividad',
        'cultivoVariedadZona',
        'cultivoVariedadZona.cultivoXVariedad',
        'cultivoVariedadZona.cultivoXVariedad.cultivo',
        'cultivoVariedadZona.cultivoXVariedad.variedad',
        'cultivoVariedadZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivoVariedadZona.zona',
        'usuariosAsignados',
        'usuariosAsignados.usuario',
        'usuariosAsignados.usuario.ficha',
        'reservas',
        'reservas.lote',
        'reservas.lote.producto',
        'reservas.lote.producto.unidadMedida',
        'reservas.estado',
      ],
    });

    // Enrich with responsable information
    return await this.enrichActividadesWithResponsable(actividades);
  }

  async findOne(id: string): Promise<Actividad> {
    const actividad = await this.actividadesRepo.findOne({ where: { id } });
    if (!actividad)
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    return actividad;
  }

  async update(id: string, dto: UpdateActividadeDto): Promise<Actividad> {
    const actividad = await this.findOne(id);
    Object.assign(actividad, dto);
    return await this.actividadesRepo.save(actividad);
  }

  async remove(id: string): Promise<void> {
    const actividad = await this.findOne(id);
    await this.actividadesRepo.remove(actividad);
  }

  async finalizar(
    id: string,
    observacion?: string,
    imgUrl?: string,
    horas?: number,
    precioHora?: number,
    userDni?: number,
  ): Promise<Actividad> {
    const actividad = await this.findOne(id);
    if (userDni && actividad.dniResponsable !== userDni) {
      throw new Error('Solo el responsable puede finalizar la actividad');
    }
    actividad.estado = false;
    actividad.fechaFinalizacion = new Date();
    if (observacion) actividad.observacion = observacion;
    if (imgUrl) actividad.imgUrl = imgUrl;
    if (horas !== undefined) actividad.horasDedicadas = horas;
    if (precioHora !== undefined) actividad.precioHora = precioHora;
    return await this.actividadesRepo.save(actividad);
  }

  // New methods for reservation management

  async createReservation(
    actividadId: string,
    loteId: string,
    cantidadReservada: number,
    estadoId: number = 1,
  ): Promise<ReservasXActividad> {
    // Get lote with product to get financial data
    const lote = await this.actividadesRepo.manager.findOne(LotesInventario, {
      where: { id: loteId },
      relations: ['producto'],
    });

    if (!lote || !lote.producto) {
      throw new NotFoundException(
        `Lote con ID ${loteId} no encontrado o sin producto`,
      );
    }

    const dto: CreateReservasXActividadDto = {
      fkActividadId: actividadId,
      fkLoteId: loteId,
      cantidadReservada,
      fkEstadoId: estadoId,
      capacidadPresentacionProducto: lote.producto.capacidadPresentacion,
      precioProducto: lote.producto.precioCompra,
    };
    const reserva = await this.reservasXActividadService.create(dto);

    // Create movement record for RESERVA
    await this.createMovementRecord(
      loteId,
      reserva.id,
      'Reserva',
      cantidadReservada,
      `Reserva para actividad agrícola`,
    );

    return reserva;
  }

  private async createMovementRecord(
    loteId: string,
    reservaId: string,
    tipoMovimientoNombre: string,
    cantidad: number,
    observacion: string,
  ): Promise<void> {
    try {
      // Import required entities and repositories
      const { TipoMovimiento } = await import(
        '../tipos_movimiento/entities/tipos_movimiento.entity'
      );

      // Find the movement type
      const tipoMovimiento = await this.reservasXActividadRepo.manager.findOne(
        TipoMovimiento,
        {
          where: { nombre: tipoMovimientoNombre },
        },
      );

      if (!tipoMovimiento) {
        console.warn(
          `Tipo de movimiento "${tipoMovimientoNombre}" no encontrado.`,
        );
        return;
      }

      // Get responsable from reserva -> actividad
      let responsable: string | undefined;
      const reserva = await this.reservasXActividadRepo.findOne({
        where: { id: reservaId },
        relations: ['actividad'],
      });
      if (reserva?.actividad?.dniResponsable) {
        // Get user details for responsable string
        const { Usuario } = await import('../usuarios/entities/usuario.entity');
        const usuario = await this.reservasXActividadRepo.manager.findOne(
          Usuario,
          {
            where: { dni: reserva.actividad.dniResponsable },
          },
        );
        if (usuario) {
          responsable = `${usuario.nombres} ${usuario.apellidos} - ${usuario.dni}`;
        }
      }

      // Create the movement record using the service (which emits notifications)
      const createDto: CreateMovimientosInventarioDto = {
        fkLoteId: loteId,
        fkReservaId: reservaId,
        fkTipoMovimientoId: tipoMovimiento.id,
        cantidad: cantidad,
        observacion: observacion,
        responsable: responsable,
      };

      await this.movimientosInventarioService.create(createDto);
      console.log(
        `✅ Movimiento de ${tipoMovimientoNombre} registrado para lote ${loteId}`,
      );
    } catch (error) {
      console.error(`❌ Error creando movimiento: ${error.message}`);
    }
  }

  async createReservationByProduct(
    actividadId: string,
    productId: string,
    cantidadReservada: number,
    estadoId: number = 1,
  ): Promise<ReservasXActividad> {
    // Find an available lote for this product
    const lotes = await this.actividadesRepo.manager.find(LotesInventario, {
      where: { fkProductoId: productId },
      relations: ['reservas', 'reservas.estado'],
    });

    // Find a lote with enough available quantity
    for (const lote of lotes) {
      // Calculate active reserved quantity (only reservations that are not 'Confirmada')
      let cantidadReservadaActiva = 0;
      if (lote.reservas) {
        for (const reserva of lote.reservas) {
          if (reserva.estado && reserva.estado.nombre !== 'Confirmada') {
            cantidadReservadaActiva +=
              (reserva.cantidadReservada || 0) -
              (reserva.cantidadDevuelta || 0);
          }
        }
      }

      // Available quantity includes cantidadDisponible + cantidadParcial - active reservations
      const cantidadDisponibleNum = Number(lote.cantidadDisponible) || 0;
      const cantidadParcialNum = Number(lote.cantidadParcial) || 0;
      const available =
        cantidadDisponibleNum + cantidadParcialNum - cantidadReservadaActiva;
      if (available >= cantidadReservada) {
        return this.createReservation(
          actividadId,
          lote.id,
          cantidadReservada,
          estadoId,
        );
      }
    }

    throw new Error(
      `No hay suficiente stock disponible para el producto ${productId}`,
    );
  }

  async confirmUsage(
    reservaId: string,
    cantidadUsada: number,
  ): Promise<ReservasXActividad> {
    const reserva = await this.reservasXActividadService.findOne(reservaId);
    reserva.cantidadUsada = cantidadUsada;
    reserva.fkEstadoId = 2; // Assuming 2 is 'Usado'
    return await this.reservasXActividadService.update(reservaId, reserva);
  }

  async calculateCost(actividadId: string): Promise<number> {
    const reservas = await this.reservasXActividadService.findAll();
    const actividadReservas = reservas.filter(
      (r) => r.fkActividadId === actividadId && r.cantidadUsada,
    );
    let totalCost = 0;
    for (const reserva of actividadReservas) {
      // Assuming cost is cantidadUsada * some price, but since no price in entities, perhaps placeholder
      // For now, just sum cantidadUsada as cost
      totalCost += reserva.cantidadUsada || 0;
    }
    return totalCost;
  }

  async getReservationsByActivity(
    actividadId: string,
  ): Promise<ReservasXActividad[]> {
    return await this.reservasXActividadRepo.find({
      where: { fkActividadId: actividadId },
      relations: [
        'lote',
        'lote.producto',
        'lote.producto.unidadMedida',
        'lote.producto.categoria',
        'estado',
      ],
    });
  }
  async findByCultivoVariedadZonaId(cvzId: string): Promise<Actividad[]> {
    console.log(
      `[${new Date().toISOString()}] 🔍 BACKEND: Finding activities for CVZ ID: ${cvzId}`,
    );
    const actividades = await this.actividadesRepo.find({
      where: { fkCultivoVariedadZonaId: cvzId },
      relations: [
        'categoriaActividad',
        'cultivoVariedadZona',
        'cultivoVariedadZona.cultivoXVariedad',
        'cultivoVariedadZona.cultivoXVariedad.cultivo',
        'cultivoVariedadZona.cultivoXVariedad.variedad',
        'cultivoVariedadZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivoVariedadZona.zona',
        'usuariosAsignados',
        'usuariosAsignados.usuario',
        'usuariosAsignados.usuario.ficha',
        'reservas',
        'reservas.lote',
        'reservas.lote.producto',
        'reservas.lote.producto.unidadMedida',
        'reservas.lote.producto.categoria',
        'reservas.estado',
      ],
      order: { fechaAsignacion: 'DESC' },
    });

    console.log(
      `[${new Date().toISOString()}] 📊 BACKEND: Found ${actividades.length} activities for CVZ ${cvzId}`,
    );
    actividades.forEach((act, idx) => {
      console.log(
        `[${new Date().toISOString()}] 👥 BACKEND: Activity ${idx + 1} (${act.id}) - Usuarios asignados: ${act.usuariosAsignados?.length || 0}`,
      );
      if (act.usuariosAsignados && act.usuariosAsignados.length > 0) {
        act.usuariosAsignados.forEach((uxa, uidx) => {
          console.log(
            `[${new Date().toISOString()}] 👤 BACKEND:   User ${uidx + 1}: ${uxa.usuario?.nombres} ${uxa.usuario?.apellidos} (DNI: ${uxa.usuario?.dni}, Activo: ${uxa.activo})`,
          );
        });
      }
    });

    // Enrich with responsable information
    const enriched = await this.enrichActividadesWithResponsable(actividades);
    console.log(
      `[${new Date().toISOString()}] ✅ BACKEND: Enriched activities with responsable info`,
    );

    // Add cost calculations for finalized activities
    const enrichedWithCosts = enriched.map((actividad) => {
      if (actividad.estado === false && actividad.reservas) {
        // finalized
        const costData = this.calculateActivityCosts(actividad);
        (actividad as any).costData = costData;
      }
      return actividad;
    });

    return enrichedWithCosts;
  }

  private async enrichActividadesWithResponsable(
    actividades: Actividad[],
  ): Promise<Actividad[]> {
    // Get all unique DNI responsables
    const dniResponsables = [
      ...new Set(
        actividades.map((act) => act.dniResponsable).filter((dni) => dni),
      ),
    ];

    if (dniResponsables.length === 0) {
      return actividades;
    }

    // Fetch user information for responsables
    const { Usuario } = await import('../usuarios/entities/usuario.entity');
    const usuarios = await this.actividadesRepo.manager.find(Usuario, {
      where: dniResponsables.map((dni) => ({ dni })),
    });

    // Create a map of DNI to user info
    const userMap = new Map<number, { nombres: string; apellidos: string }>();
    usuarios.forEach((user) => {
      userMap.set(user.dni, {
        nombres: user.nombres,
        apellidos: user.apellidos,
      });
    });

    // Enrich actividades with responsable info and reorder to show responsable first
    const enriched = actividades.map((actividad) => {
      if (actividad.dniResponsable && userMap.has(actividad.dniResponsable)) {
        const user = userMap.get(actividad.dniResponsable)!;
        (actividad as any).responsableNombre =
          `${user.nombres} ${user.apellidos}`;
        (actividad as any).responsableDni = actividad.dniResponsable;
      }
      return actividad;
    });

    // Sort to show responsable first (assuming current user is the responsable)
    // For now, we'll keep the order but mark the responsable
    return enriched;
  }

  private calculateActivityCosts(actividad: Actividad): any {
    if (!actividad.reservas) return null;

    let totalInputsCost = 0;
    const reservationsWithCosts = actividad.reservas.map((reserva) => {
      const cantidadUsada = reserva.cantidadUsada || 0;
      let unitPrice = 0;
      let subtotal = 0;

      // Check if product is divisible (consumable) or not (tool)
      const esDivisible =
        reserva.lote?.producto?.categoria?.esDivisible ?? true; // Default true for compatibility

      if (esDivisible) {
        // Logic for divisible products (consumables)
        unitPrice =
          reserva.capacidadPresentacionProducto > 0
            ? reserva.precioProducto / reserva.capacidadPresentacionProducto
            : 0;
        subtotal = cantidadUsada * unitPrice;
      } else {
        // Logic for non-divisible products (tools) - depreciation per use
        const vidaUtilPromedioPorUsos =
          reserva.lote?.producto?.vidaUtilPromedioPorUsos;

        if (vidaUtilPromedioPorUsos && vidaUtilPromedioPorUsos > 0) {
          // Residual value = 10% of product price
          const valorResidual = reserva.precioProducto * 0.1;
          const costoPorUso =
            (reserva.precioProducto - valorResidual) / vidaUtilPromedioPorUsos;

          // Each use counts as 1 usage
          unitPrice = costoPorUso;
          subtotal = costoPorUso; // Since cantidadUsada represents number of uses
        } else {
          // Fallback: if no useful life defined, use normal logic
          unitPrice =
            reserva.capacidadPresentacionProducto > 0
              ? reserva.precioProducto / reserva.capacidadPresentacionProducto
              : 0;
          subtotal = cantidadUsada * unitPrice;
        }
      }

      totalInputsCost += subtotal;

      return {
        ...reserva,
        unitPrice,
        subtotal,
      };
    });

    // Labor cost: horasDedicadas * precioHora (use precioHora if set, else default to 0)
    const laborRate = actividad.precioHora || 0; // or get from config
    const laborCost = (actividad.horasDedicadas || 0) * laborRate;

    const totalActivityCost = totalInputsCost + laborCost;

    return {
      reservations: reservationsWithCosts,
      totalInputsCost,
      laborCost,
      totalActivityCost,
    };
  }
}
