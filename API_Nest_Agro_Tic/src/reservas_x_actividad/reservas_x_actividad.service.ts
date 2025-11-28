import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservasXActividad } from './entities/reservas_x_actividad.entity';
import { CreateReservasXActividadDto } from './dto/create-reservas_x_actividad.dto';
import { UpdateReservasXActividadDto } from './dto/update-reservas_x_actividad.dto';
import { FinalizeActivityDto } from './dto/finalize-activity.dto';
import { Actividad } from '../actividades/entities/actividades.entity';
import { EstadoReserva } from '../estados_reserva/entities/estados_reserva.entity';
import { LotesInventario } from '../lotes_inventario/entities/lotes_inventario.entity';
import { MovimientosInventario } from '../movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from '../tipos_movimiento/entities/tipos_movimiento.entity';
import { UsuariosXActividadesService } from '../usuarios_x_actividades/usuarios_x_actividades.service';
import { MovimientosInventarioService } from '../movimientos_inventario/movimientos_inventario.service';
import { CreateMovimientosInventarioDto } from '../movimientos_inventario/dto/create-movimientos_inventario.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReservasXActividadService {
  constructor(
    @InjectRepository(ReservasXActividad)
    private readonly reservasXActividadRepo: Repository<ReservasXActividad>,
    @InjectRepository(Actividad)
    private readonly actividadRepo: Repository<Actividad>,
    @InjectRepository(EstadoReserva)
    private readonly estadoReservaRepo: Repository<EstadoReserva>,
    @InjectRepository(LotesInventario)
    private readonly lotesInventarioRepo: Repository<LotesInventario>,
    @InjectRepository(MovimientosInventario)
    private readonly movimientosInventarioRepo: Repository<MovimientosInventario>,
    @InjectRepository(TipoMovimiento)
    private readonly tipoMovimientoRepo: Repository<TipoMovimiento>,
    private readonly usuariosXActividadesService: UsuariosXActividadesService,
    private readonly movimientosInventarioService: MovimientosInventarioService,
  ) {}

  async create(
    createDto: CreateReservasXActividadDto,
  ): Promise<ReservasXActividad> {
    // Get the lote with producto relation to copy financial data
    const lote = await this.lotesInventarioRepo.findOne({
      where: { id: createDto.fkLoteId },
      relations: ['producto'],
    });

    if (!lote || !lote.producto) {
      throw new BadRequestException(
        `Lote con ID ${createDto.fkLoteId} no encontrado o no tiene producto asociado`,
      );
    }

    // Copy financial data from product to ensure immutability
    // For non-divisible products (tools), capacity is always 1
    const esDivisible = lote.producto.categoria?.esDivisible ?? true;
    const capacidadPresentacion = esDivisible
      ? lote.producto.capacidadPresentacion
      : 1;

    const entity = this.reservasXActividadRepo.create({
      ...createDto,
      capacidadPresentacionProducto: capacidadPresentacion,
      precioProducto: lote.producto.precioCompra,
    });

    return await this.reservasXActividadRepo.save(entity);
  }

  async findAll(): Promise<ReservasXActividad[]> {
    return await this.reservasXActividadRepo.find({
      relations: ['actividad', 'lote', 'estado'],
    });
  }

  async findOne(id: string): Promise<ReservasXActividad> {
    const entity = await this.reservasXActividadRepo.findOne({
      where: { id },
      relations: ['actividad', 'lote', 'estado'],
    });
    if (!entity)
      throw new NotFoundException(
        `ReservasXActividad con ID ${id} no encontrado`,
      );
    return entity;
  }

  async update(
    id: string,
    updateDto: UpdateReservasXActividadDto,
  ): Promise<ReservasXActividad> {
    const entity = await this.findOne(id);
    Object.assign(entity, updateDto);
    return await this.reservasXActividadRepo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.reservasXActividadRepo.remove(entity);
  }

  async finalizeActivity(
    finalizeDto: FinalizeActivityDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    console.log('🔍 SERVICE: Starting finalizeActivity with:', {
      actividadId: finalizeDto.actividadId,
      reservas: finalizeDto.reservas,
      horas: finalizeDto.horas,
      precioHora: finalizeDto.precioHora,
      observacion: finalizeDto.observacion,
      file: file
        ? { originalname: file.originalname, size: file.size }
        : 'No file',
    });

    // Find the activity with relations
    const actividad = await this.actividadRepo.findOne({
      where: { id: finalizeDto.actividadId },
      relations: ['categoriaActividad'],
    });
    if (!actividad) {
      throw new NotFoundException(
        `Actividad con ID ${finalizeDto.actividadId} no encontrada`,
      );
    }
    console.log('🔍 SERVICE: Found activity:', actividad);

    // Find the confirmed state
    const estadoConfirmada = await this.estadoReservaRepo.findOne({
      where: { nombre: 'Confirmada' },
    });
    if (!estadoConfirmada) {
      throw new NotFoundException(
        'Estado de reserva "Confirmada" no encontrado',
      );
    }

    // Process each reservation
    console.log('🔍 SERVICE: Processing reservations:', finalizeDto.reservas);
    for (const reservaDto of finalizeDto.reservas) {
      console.log('🔍 SERVICE: Processing reservation:', reservaDto);
      const reserva = await this.reservasXActividadRepo.findOne({
        where: { id: reservaDto.reservaId },
        relations: [
          'actividad',
          'lote',
          'lote.producto',
          'lote.producto.categoria',
        ],
      });

      if (!reserva) {
        throw new NotFoundException(
          `Reserva con ID ${reservaDto.reservaId} no encontrada`,
        );
      }

      // Verify the reservation belongs to the activity
      if (reserva.fkActividadId !== finalizeDto.actividadId) {
        throw new BadRequestException(
          `La reserva ${reservaDto.reservaId} no pertenece a la actividad ${finalizeDto.actividadId}`,
        );
      }

      // Set cantidad_devuelta
      reserva.cantidadDevuelta = reservaDto.cantidadDevuelta || 0;

      // Determine if the product is consumable or non-consumable
      const esConsumible =
        reserva.lote?.producto?.categoria?.esDivisible ?? true;

      if (esConsumible) {
        // For consumables: cantidad_usada = cantidad_reservada - cantidad_devuelta
        reserva.cantidadUsada =
          reserva.cantidadReservada - reserva.cantidadDevuelta;
      } else {
        // For non-consumables: cantidad_usada = difference if not all returned
        if (reserva.cantidadDevuelta < reserva.cantidadReservada) {
          reserva.cantidadUsada =
            reserva.cantidadReservada - reserva.cantidadDevuelta;
        } else {
          reserva.cantidadUsada = 0; // All returned, no usage
        }
      }

      // Change estado to confirmed
      reserva.fkEstadoId = estadoConfirmada.id;

      console.log('🔍 SERVICE: Saving reservation:', reserva);
      // Save the reservation
      await this.reservasXActividadRepo.save(reserva);

      // Create movement record for DEVOLUCIÓN if there's a return
      if (reserva.cantidadDevuelta > 0) {
        const categoriaNombre =
          actividad.categoriaActividad?.nombre || 'Sin categoría';
        const observacion = `Devolución por finalización de actividad agrícola: ${categoriaNombre}`;
        await this.createMovementRecord(
          reserva.fkLoteId,
          reserva.id,
          'Devolución',
          reserva.cantidadDevuelta,
          observacion,
        );
      }

      // Update inventory proportionally only for consumables or when there's actual usage
      if (esConsumible || reserva.cantidadUsada > 0) {
        await this.updateLoteInventoryProportionally(
          reserva.fkLoteId,
          reserva.cantidadUsada,
        );
      }

      // Create movement record for the usage with activity category (only if there's usage)
      if (reserva.cantidadUsada > 0) {
        const categoriaNombre =
          actividad.categoriaActividad?.nombre || 'Sin categoría';
        const observacion = `Salida por finalización de actividad agrícola: ${categoriaNombre}`;
        await this.createMovementRecord(
          reserva.fkLoteId,
          reserva.id,
          'Salida',
          reserva.cantidadUsada,
          observacion,
        );
      }
    }

    // Update activity with finalization data
    console.log('🔍 SERVICE: Updating activity with finalization data');
    actividad.horasDedicadas = finalizeDto.horas;
    actividad.precioHora = finalizeDto.precioHora;
    actividad.observacion = finalizeDto.observacion;
    actividad.estado = false;
    actividad.fechaFinalizacion = new Date();

    // Handle file upload if provided
    if (file) {
      console.log(
        `[${new Date().toISOString()}] 🔍 SERVICE: Handling file upload for activity ${finalizeDto.actividadId} - File: ${file.originalname}, Size: ${file.size} bytes`,
      );
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(
          `[${new Date().toISOString()}] 📁 SERVICE: Created uploads directory: ${uploadDir}`,
        );
      }
      const fileName = `imgUrl-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${file.originalname.split('.').pop()}`;
      const filePath = path.join(uploadDir, fileName);
      console.log(
        `[${new Date().toISOString()}] 💾 SERVICE: Saving image to: ${filePath}`,
      );
      fs.writeFileSync(filePath, file.buffer);
      actividad.imgUrl = `/uploads/${fileName}`;
      console.log(
        `[${new Date().toISOString()}] ✅ SERVICE: Image saved successfully for activity ${finalizeDto.actividadId} - File: ${fileName}, Full URL: /uploads/${fileName}`,
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] 🔍 SERVICE: No image file provided for activity ${finalizeDto.actividadId}`,
      );
    }

    console.log(
      `[${new Date().toISOString()}] 💾 SERVICE: Saving updated activity ${finalizeDto.actividadId} with image URL: ${actividad.imgUrl || 'No image'}`,
    );
    await this.actividadRepo.save(actividad);

    // Update usuarios_x_actividades to set activo = false for this activity
    await this.usuariosXActividadesService.finalizarByActividad(
      finalizeDto.actividadId,
    );

    console.log(
      `[${new Date().toISOString()}] ✅ SERVICE: Activity ${finalizeDto.actividadId} finalized successfully with image evidence saved`,
    );
  }

  private async updateLoteInventoryProportionally(
    loteId: string,
    cantidadUsada: number,
  ): Promise<void> {
    console.log(
      `🔄 Actualizando inventario del lote ${loteId} con cantidad usada: ${cantidadUsada}`,
    );

    const lote = await this.lotesInventarioRepo.findOne({
      where: { id: loteId },
      relations: ['producto'],
    });

    if (!lote) {
      throw new NotFoundException(`Lote con ID ${loteId} no encontrado`);
    }

    if (!lote.producto) {
      throw new NotFoundException(`Producto para lote ${loteId} no encontrado`);
    }

    const capacidadPresentacion = lote.producto.capacidadPresentacion;
    console.log(
      `📦 Capacidad de presentación del producto: ${capacidadPresentacion}`,
    );

    // Estado actual del lote
    const stockInicial = lote.stock || 0;
    const cantidadDisponibleInicial = lote.cantidadDisponible || 0;
    const cantidadParcialInicial = lote.cantidadParcial || 0;

    console.log(`📊 Estado inicial del lote:`);
    console.log(`  - Stock: ${stockInicial}`);
    console.log(`  - Cantidad disponible: ${cantidadDisponibleInicial}`);
    console.log(`  - Cantidad parcial: ${cantidadParcialInicial}`);
    console.log(
      `  - Total disponible para mostrar: ${cantidadDisponibleInicial + cantidadParcialInicial}`,
    );

    // Lógica de consumo: primero parcial, luego disponible
    let cantidadUsadaRestante = cantidadUsada;
    let nuevaCantidadParcial = cantidadParcialInicial;
    let nuevaCantidadDisponible = cantidadDisponibleInicial;
    let stockAEliminar = 0;

    // 1. Consumir primero de cantidad parcial (no afecta stock)
    if (cantidadUsadaRestante > 0 && nuevaCantidadParcial > 0) {
      if (cantidadUsadaRestante >= nuevaCantidadParcial) {
        cantidadUsadaRestante -= nuevaCantidadParcial;
        nuevaCantidadParcial = 0;
      } else {
        nuevaCantidadParcial -= cantidadUsadaRestante;
        cantidadUsadaRestante = 0;
      }
    }

    // 2. Consumir de cantidad disponible (sí afecta stock)
    if (cantidadUsadaRestante > 0 && nuevaCantidadDisponible > 0) {
      const cantidadConsumidaDeDisponible = Math.min(
        cantidadUsadaRestante,
        nuevaCantidadDisponible,
      );
      nuevaCantidadDisponible -= cantidadConsumidaDeDisponible;
      cantidadUsadaRestante -= cantidadConsumidaDeDisponible;

      // Calcular cuánto stock eliminar: stock_a_eliminar = cantidad_consumida / capacidad_presentacion
      stockAEliminar = cantidadConsumidaDeDisponible / capacidadPresentacion;
    }

    // Verificar que se consumió todo
    if (cantidadUsadaRestante > 0) {
      throw new Error(
        `No hay suficiente inventario en el lote ${loteId} para consumir ${cantidadUsada}`,
      );
    }

    // Calcular nuevo stock
    const nuevoStock = Math.max(0, stockInicial - stockAEliminar);

    console.log(`📊 Consumo realizado:`);
    console.log(
      `  - Cantidad consumida de parcial: ${cantidadParcialInicial - nuevaCantidadParcial}`,
    );
    console.log(
      `  - Cantidad consumida de disponible: ${cantidadDisponibleInicial - nuevaCantidadDisponible}`,
    );
    console.log(`  - Stock eliminado: ${stockAEliminar}`);
    console.log(`  - Nuevo stock: ${nuevoStock}`);

    console.log(`📊 Nuevo estado del lote:`);
    console.log(`  - Stock: ${nuevoStock}`);
    console.log(`  - Cantidad disponible: ${nuevaCantidadDisponible}`);
    console.log(`  - Cantidad parcial: ${nuevaCantidadParcial}`);
    console.log(
      `  - Total disponible para mostrar: ${nuevaCantidadDisponible + nuevaCantidadParcial}`,
    );

    // Actualizar el lote
    lote.stock = nuevoStock;
    lote.cantidadDisponible = nuevaCantidadDisponible;
    lote.cantidadParcial = nuevaCantidadParcial;

    await this.lotesInventarioRepo.save(lote);
    console.log(`✅ Lote ${loteId} actualizado correctamente`);
  }

  private async createMovementRecord(
    loteId: string,
    reservaId: string,
    tipoMovimientoNombre: string,
    cantidad: number,
    observacion: string,
    userDni?: number,
  ): Promise<void> {
    try {
      // Find the movement type
      const tipoMovimiento = await this.tipoMovimientoRepo.findOne({
        where: { nombre: tipoMovimientoNombre },
      });

      if (!tipoMovimiento) {
        console.warn(
          `Tipo de movimiento "${tipoMovimientoNombre}" no encontrado.`,
        );
        return;
      }

      // Get responsable from reserva -> actividad or from userDni parameter
      let responsable: string | undefined;
      if (userDni) {
        // Direct from parameter (for cases where user context is available)
        const { Usuario } = await import('../usuarios/entities/usuario.entity');
        const usuario = await this.reservasXActividadRepo.manager.findOne(
          Usuario,
          {
            where: { dni: userDni },
          },
        );
        if (usuario) {
          responsable = `${usuario.nombres} ${usuario.apellidos} - ${usuario.dni}`;
        }
      } else {
        // From reserva -> actividad (fallback for existing logic)
        const reserva = await this.reservasXActividadRepo.findOne({
          where: { id: reservaId },
          relations: ['actividad'],
        });
        if (reserva?.actividad?.dniResponsable) {
          const { Usuario } = await import(
            '../usuarios/entities/usuario.entity'
          );
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
}
