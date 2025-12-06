import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './entities/productos.entity';
import { CreateProductosDto } from './dto/create-productos.dto';
import { UpdateProductosDto } from './dto/update-productos.dto';
import { CreateProductoWithLoteDto } from './dto/create-producto-with-lote.dto';
import { LotesInventario } from '../lotes_inventario/entities/lotes_inventario.entity';
import { MovimientosInventario } from '../movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from '../tipos_movimiento/entities/tipos_movimiento.entity';
import { MovimientosInventarioService } from '../movimientos_inventario/movimientos_inventario.service';
import { CreateMovimientosInventarioDto } from '../movimientos_inventario/dto/create-movimientos_inventario.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(MovimientosInventario)
    private readonly movimientosInventarioRepo: Repository<MovimientosInventario>,
    @InjectRepository(TipoMovimiento)
    private readonly tipoMovimientoRepo: Repository<TipoMovimiento>,
    private readonly movimientosInventarioService: MovimientosInventarioService,
  ) {}

  async create(createDto: CreateProductosDto): Promise<Producto> {
    // Check if sku already exists
    const existing = await this.productoRepo.findOne({
      where: { sku: createDto.sku },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un producto con SKU ${createDto.sku}`);
    }
    const entity = this.productoRepo.create(createDto);
    return await this.productoRepo.save(entity);
  }

  async findAll(): Promise<Producto[]> {
    return await this.productoRepo.find({
      relations: ['categoria', 'unidadMedida'],
    });
  }

  async findOne(id: string): Promise<Producto> {
    const entity = await this.productoRepo.findOne({
      where: { id },
      relations: ['categoria', 'unidadMedida'],
    });
    if (!entity)
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    return entity;
  }

  async update(
    id: string,
    updateDto: UpdateProductosDto,
    userDni?: number,
  ): Promise<Producto> {
    const entity = await this.findOne(id);

    // Check if sku is being changed and if it already exists
    if (updateDto.sku && updateDto.sku !== entity.sku) {
      const existing = await this.productoRepo.findOne({
        where: { sku: updateDto.sku },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un producto con SKU ${updateDto.sku}`);
      }
    }

    // Check if product has active reservations that would prevent certain updates
    if (updateDto.nombre || updateDto.descripcion || updateDto.sku) {
      const lotes = await this.productoRepo.manager.find(LotesInventario, {
        where: { fkProductoId: id },
        relations: ['reservas', 'reservas.estado'],
      });

      const hasActiveReservations = lotes.some(lote =>
        lote.reservas?.some(reserva =>
          reserva.estado?.nombre !== 'Confirmada' && reserva.estado?.nombre !== 'Cancelada'
        )
      );

      if (hasActiveReservations) {
        throw new ConflictException(
          `No se puede actualizar el producto "${entity.nombre}" porque tiene reservas activas en actividades. ` +
          `Complete o cancele las actividades relacionadas antes de modificar los datos básicos del producto.`
        );
      }
    }

    Object.assign(entity, updateDto);
    const savedEntity = await this.productoRepo.save(entity);

    // Create movement record for AJUSTE when product is updated
    if (userDni) {
      // Get all lotes for this product to create adjustment movements
      const lotes = await this.productoRepo.manager.find(LotesInventario, {
        where: { fkProductoId: id },
      });

      for (const lote of lotes) {
        await this.createMovementRecord(
          { manager: this.productoRepo.manager },
          lote.id,
          'Ajuste',
          0, // No quantity change for product data updates
          `Ajuste manual de inventario: modificación de datos del producto ${savedEntity.nombre}`,
          userDni,
        );
      }
    }

    return savedEntity;
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);

    // Check if product has inventory lots
    const lotesCount = await this.productoRepo.manager.count(LotesInventario, {
      where: { fkProductoId: id },
    });

    if (lotesCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el producto "${entity.nombre}" porque tiene ${lotesCount} lote(s) de inventario asociado(s). ` +
        `Elimine primero todos los lotes de inventario relacionados antes de eliminar el producto.`
      );
    }

    // Check if product is being used in activities (through reservations)
    const { ReservasXActividad } = await import('../reservas_x_actividad/entities/reservas_x_actividad.entity');
    const reservasCount = await this.productoRepo.manager
      .createQueryBuilder(ReservasXActividad, 'reserva')
      .innerJoin('reserva.lote', 'lote')
      .where('lote.fkProductoId = :productId', { productId: id })
      .getCount();

    if (reservasCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el producto "${entity.nombre}" porque está siendo utilizado en ${reservasCount} reserva(s) de actividades. ` +
        `Complete o cancele las actividades relacionadas antes de eliminar el producto.`
      );
    }

    await this.productoRepo.remove(entity);
  }

  private async createMovementRecord(
    queryRunner: any,
    loteId: string,
    tipoMovimientoNombre: string,
    cantidad: number,
    observacion: string,
    userDni?: number,
  ): Promise<void> {
    try {
      // Find the movement type
      const tipoMovimiento = await queryRunner.manager.findOne(TipoMovimiento, {
        where: { nombre: tipoMovimientoNombre },
      });

      if (!tipoMovimiento) {
        console.warn(
          `Tipo de movimiento "${tipoMovimientoNombre}" no encontrado.`,
        );
        return;
      }

      // Get responsable information if userDni provided
      let responsable: string | undefined;
      if (userDni) {
        const { Usuario } = await import('../usuarios/entities/usuario.entity');
        const usuario = await queryRunner.manager.findOne(Usuario, {
          where: { dni: userDni },
        });
        if (usuario) {
          responsable = `${usuario.nombres} ${usuario.apellidos} - ${usuario.dni}`;
        }
      }

      // Create the movement record using the service (which emits notifications)
      const createDto: CreateMovimientosInventarioDto = {
        fkLoteId: loteId,
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

  async createWithLote(
    createDto: CreateProductoWithLoteDto,
    userDni?: number,
  ): Promise<Producto> {
    // Check if sku already exists
    const existing = await this.productoRepo.findOne({
      where: { sku: createDto.sku },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un producto con SKU ${createDto.sku}`);
    }

    // Start transaction
    const queryRunner =
      this.productoRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create product
      const producto = this.productoRepo.create({
        nombre: createDto.nombre,
        descripcion: createDto.descripcion,
        sku: createDto.sku,
        precioCompra: createDto.precioCompra,
        capacidadPresentacion: createDto.capacidadPresentacion,
        fkCategoriaId: createDto.fkCategoriaId,
        fkUnidadMedidaId: createDto.fkUnidadMedidaId,
        vidaUtilPromedioPorUsos: createDto.vidaUtilPromedioPorUsos,
        imgUrl: createDto.imgUrl,
      });
      const savedProducto = await queryRunner.manager.save(Producto, producto);

      // Calculate cantidadDisponible = stock * capacidadPresentacion
      const cantidadDisponible =
        createDto.stock * (savedProducto.capacidadPresentacion || 1);

      // Create lot inventory
      const loteInventario = queryRunner.manager.create(LotesInventario, {
        fkProductoId: savedProducto.id,
        fkBodegaId: createDto.fkBodegaId,
        cantidadDisponible,
        stock: createDto.stock,
        esParcial: false, // Default to false
        cantidadParcial: 0, // Default to 0
        fechaVencimiento: createDto.fechaVencimiento
          ? new Date(createDto.fechaVencimiento)
          : undefined,
      });
      const savedLote = await queryRunner.manager.save(
        LotesInventario,
        loteInventario,
      );

      // Create movement record for ENTRADA
      await this.createMovementRecord(
        queryRunner,
        savedLote.id,
        'Entrada',
        cantidadDisponible,
        `Entrada de producto: ${savedProducto.nombre}`,
        userDni,
      );

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedProducto;
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }
}
