import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { LotesInventario } from './entities/lotes_inventario.entity';
import { CreateLotesInventarioDto } from './dto/create-lotes_inventario.dto';
import { UpdateLotesInventarioDto } from './dto/update-lotes_inventario.dto';
import { Producto } from '../productos/entities/productos.entity';
import { MovimientosInventario } from '../movimientos_inventario/entities/movimientos_inventario.entity';
import { TipoMovimiento } from '../tipos_movimiento/entities/tipos_movimiento.entity';
import { MovimientosInventarioService } from '../movimientos_inventario/movimientos_inventario.service';
import { CreateMovimientosInventarioDto } from '../movimientos_inventario/dto/create-movimientos_inventario.dto';

@Injectable()
export class LotesInventarioService {
  constructor(
    @InjectRepository(LotesInventario)
    private readonly lotesInventarioRepo: Repository<LotesInventario>,
    @InjectRepository(MovimientosInventario)
    private readonly movimientosInventarioRepo: Repository<MovimientosInventario>,
    @InjectRepository(TipoMovimiento)
    private readonly tipoMovimientoRepo: Repository<TipoMovimiento>,
    private readonly movimientosInventarioService: MovimientosInventarioService,
  ) {}

  async create(createDto: CreateLotesInventarioDto): Promise<LotesInventario> {
    // Fetch the product to get capacidadPresentacion
    const producto = await this.lotesInventarioRepo.manager.findOne(Producto, {
      where: { id: createDto.fkProductoId },
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto con ID ${createDto.fkProductoId} no encontrado`,
      );
    }

    // Calculate cantidadDisponible = stock * capacidadPresentacion
    const cantidadDisponible =
      createDto.stock * (producto.capacidadPresentacion || 1);

    const entity = this.lotesInventarioRepo.create({
      ...createDto,
      cantidadDisponible,
    });
    return await this.lotesInventarioRepo.save(entity);
  }

  async findAll(): Promise<LotesInventario[]> {
    return await this.lotesInventarioRepo.find({
      relations: ['producto', 'producto.unidadMedida', 'bodega', 'reservas'],
    });
  }

  async findOne(id: string): Promise<LotesInventario> {
    const entity = await this.lotesInventarioRepo.findOne({
      where: { id },
      relations: ['producto', 'bodega', 'reservas'],
    });
    if (!entity)
      throw new NotFoundException(`LotesInventario con ID ${id} no encontrado`);
    return entity;
  }

  async update(
    id: string,
    updateDto: UpdateLotesInventarioDto,
    userDni?: number,
  ): Promise<LotesInventario> {
    console.log('DEBUG: update called with ID:', id);
    console.log('DEBUG: updateDto:', updateDto);
    console.log('DEBUG: userDni:', userDni);

    const entity = await this.findOne(id);
    console.log('DEBUG: found entity:', entity);

    // Store original values for movement calculation
    const originalStock = entity.stock;
    const originalCantidadDisponible = entity.cantidadDisponible;

    // Check if any data was modified (for AJUSTE movement)
    const hasProductUpdates =
      updateDto.nombre ||
      updateDto.descripcion ||
      updateDto.sku ||
      updateDto.precioCompra ||
      updateDto.capacidadPresentacion ||
      updateDto.fkCategoriaId ||
      updateDto.fkUnidadMedidaId ||
      updateDto.vidaUtilPromedioPorUsos !== undefined;
    const hasLoteUpdates =
      updateDto.fkBodegaId ||
      updateDto.stock ||
      updateDto.fechaVencimiento !== undefined;
    const hasAnyUpdates = hasProductUpdates || hasLoteUpdates;

    // Handle product updates if provided
    if (hasProductUpdates) {
      const producto = await entity.producto;
      if (producto) {
        if (updateDto.nombre) producto.nombre = updateDto.nombre;
        if (updateDto.descripcion !== undefined)
          producto.descripcion = updateDto.descripcion;
        if (updateDto.sku !== undefined) producto.sku = updateDto.sku;
        if (updateDto.precioCompra)
          producto.precioCompra = updateDto.precioCompra;
        if (updateDto.capacidadPresentacion)
          producto.capacidadPresentacion = updateDto.capacidadPresentacion;
        if (updateDto.fkCategoriaId)
          producto.fkCategoriaId = updateDto.fkCategoriaId;
        if (updateDto.fkUnidadMedidaId)
          producto.fkUnidadMedidaId = updateDto.fkUnidadMedidaId;
        if (updateDto.vidaUtilPromedioPorUsos !== undefined)
          producto.vidaUtilPromedioPorUsos = updateDto.vidaUtilPromedioPorUsos;

        await this.lotesInventarioRepo.manager.save(producto);
        console.log('DEBUG: producto updated');
      }
    }

    // Handle lote inventory updates
    if (updateDto.fkBodegaId) entity.fkBodegaId = updateDto.fkBodegaId;
    if (updateDto.stock) {
      entity.stock = updateDto.stock;
      // Recalculate cantidadDisponible
      const producto = await entity.producto;
      if (producto) {
        entity.cantidadDisponible =
          updateDto.stock * (producto.capacidadPresentacion || 1);
      }
    }
    if (updateDto.fechaVencimiento !== undefined)
      entity.fechaVencimiento = updateDto.fechaVencimiento
        ? new Date(updateDto.fechaVencimiento)
        : undefined;

    const savedEntity = await this.lotesInventarioRepo.save(entity);
    console.log('DEBUG: lote updated:', savedEntity);

    // Create movement record for AJUSTE if any data was modified
    if (hasAnyUpdates) {
      const cantidadAjuste =
        savedEntity.cantidadDisponible - originalCantidadDisponible;
      if (cantidadAjuste !== 0) {
        await this.createMovementRecord(
          savedEntity.id,
          'Ajuste',
          Math.abs(cantidadAjuste),
          `Ajuste manual de inventario: ${cantidadAjuste > 0 ? 'incremento' : 'decremento'} de ${Math.abs(cantidadAjuste)} unidades`,
          userDni,
        );
      } else {
        // If no quantity change but other fields were updated, still create AJUSTE movement
        await this.createMovementRecord(
          savedEntity.id,
          'Ajuste',
          0,
          `Ajuste manual de inventario: modificación de datos del producto`,
          userDni,
        );
      }
    }

    return savedEntity;
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.lotesInventarioRepo.remove(entity);
  }

  private async createMovementRecord(
    loteId: string,
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

      // Get responsable information if userDni provided
      let responsable: string | undefined;
      if (userDni) {
        const { Usuario } = await import('../usuarios/entities/usuario.entity');
        const usuario = await this.lotesInventarioRepo.manager.findOne(
          Usuario,
          {
            where: { dni: userDni },
          },
        );
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

  async search(query: string, page: number = 1, limit: number = 10) {
    console.log(
      `Starting search for query: "${query}", page: ${page}, limit: ${limit}`,
    );

    try {
      const skip = (page - 1) * limit;

      // First, get all lotes that match the product name search
      const lotes = await this.lotesInventarioRepo.find({
        where: query
          ? {
              producto: {
                nombre: ILike(`%${query}%`),
              },
            }
          : {},
        relations: [
          'producto',
          'producto.categoria',
          'producto.unidadMedida',
          'bodega',
          'reservas',
          'reservas.estado',
        ],
      });

      console.log(`Found ${lotes.length} lotes matching product name search`);

      // Group by product and calculate availability like getAvailableProducts
      const productMap = new Map();

      for (const lote of lotes) {
        console.log(`Processing lote ${lote.id} for search results`);
        if (!lote.producto) {
          console.log(`Skipping lote ${lote.id} - no producto relation`);
          continue;
        }

        const productId = lote.fkProductoId;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product: lote.producto,
            totalAvailable: 0,
            totalPartialReturns: 0,
            hasPartialReturns: false,
            lotes: [],
          });
        }

        const productData = productMap.get(productId);
        productData.lotes.push(lote);

        // Calculate available quantity for this lote - handle null values and convert strings to numbers
        const cantidadDisponible =
          lote.cantidadDisponible !== null &&
          lote.cantidadDisponible !== undefined
            ? Number(lote.cantidadDisponible)
            : 0;
        const cantidadParcial =
          lote.cantidadParcial !== null && lote.cantidadParcial !== undefined
            ? Number(lote.cantidadParcial)
            : 0;

        // Calculate active reserved quantity (only reservations that are not 'Confirmada')
        let cantidadReservadaActiva = 0;
        if (lote.reservas) {
          for (const reserva of lote.reservas) {
            if (reserva.estado && reserva.estado.nombre !== 'Confirmada') {
              cantidadReservadaActiva +=
                Number(reserva.cantidadReservada || 0) -
                Number(reserva.cantidadDevuelta || 0);
            }
          }
        }

        console.log(
          `🔍 DEBUG Lote ${lote.id}: raw_disponible=${lote.cantidadDisponible} (type: ${typeof lote.cantidadDisponible}), raw_parcial=${lote.cantidadParcial} (type: ${typeof lote.cantidadParcial}), cantidad_reservada_activa=${cantidadReservadaActiva}`,
        );
        console.log(
          `🔍 DEBUG Lote ${lote.id}: converted_disponible=${cantidadDisponible} (type: ${typeof cantidadDisponible}), converted_parcial=${cantidadParcial} (type: ${typeof cantidadParcial}), reservada_activa=${cantidadReservadaActiva}`,
        );

        const availableInLote =
          cantidadDisponible + cantidadParcial - cantidadReservadaActiva;
        productData.totalAvailable += availableInLote;
        console.log(
          `🔍 Lote ${lote.id}: disponible=${cantidadDisponible}, parcial=${cantidadParcial}, reservada_activa=${cantidadReservadaActiva}, disponible_calculado=${availableInLote}, total_acumulado=${productData.totalAvailable}`,
        );

        // Calculate partial returns from reservations
        if (lote.reservas) {
          console.log(
            `Lote ${lote.id} has ${lote.reservas.length} reservations`,
          );
          for (const reserva of lote.reservas) {
            if (reserva.cantidadDevuelta && reserva.cantidadDevuelta > 0) {
              productData.totalPartialReturns += reserva.cantidadDevuelta;
              productData.hasPartialReturns = true;
              console.log(
                `Reservation ${reserva.id}: devuelta ${reserva.cantidadDevuelta}`,
              );
            }
          }
        } else {
          console.log(`Lote ${lote.id} has no reservations`);
        }
      }

      console.log(`Product map has ${productMap.size} products after grouping`);

      // Convert to array and sort: products with partial returns first, then by availability
      const products = Array.from(productMap.values())
        .filter((item) => {
          console.log(
            `🔍 Filtrando producto ${item.product.nombre}: totalAvailable=${item.totalAvailable}, hasPartialReturns=${item.hasPartialReturns}`,
          );
          return item.totalAvailable > 0; // Only show products with available quantity
        })
        .sort((a, b) => {
          if (a.hasPartialReturns && !b.hasPartialReturns) return -1;
          if (!a.hasPartialReturns && b.hasPartialReturns) return 1;
          return b.totalAvailable - a.totalAvailable; // Sort by availability descending
        });

      console.log(
        `After filtering available products: ${products.length} products`,
      );

      // Apply pagination to the results
      const total = products.length;
      const paginatedProducts = products.slice(skip, skip + limit);

      console.log(
        `Returning page ${page} with ${paginatedProducts.length} products (total: ${total})`,
      );

      // Log activity for search in reservation context
      console.log(
        `Search activity logged: Query "${query}" returned ${total} available products`,
      );

      // Return in frontend-friendly format
      const result = paginatedProducts.map((item) => ({
        id: item.product.id,
        nombre: item.product.nombre,
        descripcion: item.product.descripcion,
        sku: item.product.sku,
        precioCompra: item.product.precioCompra,
        esDivisible: item.product.categoria?.esDivisible,
        capacidadPresentacion: item.product.capacidadPresentacion,
        categoria: item.product.categoria,
        unidadMedida: item.product.unidadMedida,
        cantidadDisponible: item.totalAvailable,
        stock_devuelto: item.totalPartialReturns,
        stock_sobrante: item.totalPartialReturns, // Assuming surplus is the partial returns available
        tieneDevolucionesParciales: item.hasPartialReturns,
        lotes: item.lotes.map((l) => ({
          id: l.id,
          cantidadDisponible: l.cantidadDisponible,
          bodega: l.bodega,
        })),
      }));

      console.log('Search completed successfully');
      return { items: result, total };
    } catch (error) {
      console.error('Error in search function:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.lotesInventarioRepo.findAndCount({
      relations: [
        'producto',
        'producto.categoria',
        'producto.unidadMedida',
        'bodega',
        'reservas',
        'reservas.estado',
      ],
      skip,
      take: limit,
    });

    // Calculate real-time quantities for each item
    const itemsWithCalculatedQuantities = items.map((item) => {
      // Calculate available quantity for reservation (cantidadDisponible + cantidadParcial - active reservations)
      const cantidadDisponible = Number(item.cantidadDisponible || 0);
      const cantidadParcial = Number(item.cantidadParcial || 0);

      // Calculate active reserved quantity (only reservations that are not 'Confirmada')
      let cantidadReservadaActiva = 0;
      if (item.reservas) {
        for (const reserva of item.reservas) {
          if (reserva.estado && reserva.estado.nombre !== 'Confirmada') {
            cantidadReservadaActiva +=
              Number(reserva.cantidadReservada || 0) -
              Number(reserva.cantidadDevuelta || 0);
          }
        }
      }

      const cantidadDisponibleParaReservar =
        cantidadDisponible + cantidadParcial - cantidadReservadaActiva;
      const stockTotal = cantidadDisponible + cantidadParcial;

      // Get unit abbreviation from product
      const unidadAbreviatura = item.producto?.unidadMedida?.abreviatura || '';

      return {
        ...item,
        stock: Number(item.stock || 0), // Original stock from lote
        stockTotal,
        cantidadDisponibleParaReservar: Math.max(
          0,
          cantidadDisponibleParaReservar,
        ), // Ensure non-negative
        cantidadReservada: cantidadReservadaActiva,
        unidadAbreviatura,
      };
    });

    return { items: itemsWithCalculatedQuantities, total };
  }

  async getAvailableProducts() {
    try {
      console.log('Starting getAvailableProducts');
      // Get all lotes with product and reservation relations
      const lotes = await this.lotesInventarioRepo.find({
        relations: [
          'producto',
          'producto.categoria',
          'producto.unidadMedida',
          'reservas',
          'reservas.estado',
        ],
      });
      console.log(`Found ${lotes.length} lotes`);

      // Group by product
      const productMap = new Map();

      for (const lote of lotes) {
        console.log(
          `Processing lote ${lote.id}, producto: ${lote.producto ? lote.producto.id : 'null'}`,
        );
        // Skip if product relation is not loaded
        if (!lote.producto) {
          console.log(`Skipping lote ${lote.id} - no producto`);
          continue;
        }

        const productId = lote.fkProductoId;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product: lote.producto,
            totalAvailable: 0,
            totalPartialReturns: 0,
            hasPartialReturns: false,
          });
        }

        const productData = productMap.get(productId);

        // Calculate available quantity for this lote - handle null values properly
        const cantidadDisponible =
          lote.cantidadDisponible !== null &&
          lote.cantidadDisponible !== undefined
            ? lote.cantidadDisponible
            : 0;
        const cantidadParcial =
          lote.cantidadParcial !== null && lote.cantidadParcial !== undefined
            ? lote.cantidadParcial
            : 0;

        // Calculate active reserved quantity (only reservations that are not 'Confirmada')
        let cantidadReservadaActiva = 0;
        if (lote.reservas) {
          for (const reserva of lote.reservas) {
            if (reserva.estado && reserva.estado.nombre !== 'Confirmada') {
              cantidadReservadaActiva +=
                Number(reserva.cantidadReservada || 0) -
                Number(reserva.cantidadDevuelta || 0);
            }
          }
        }

        const availableInLote =
          cantidadDisponible + cantidadParcial - cantidadReservadaActiva;
        productData.totalAvailable += availableInLote;
        console.log(
          `🔍 Lote ${lote.id}: disponible=${cantidadDisponible}, parcial=${cantidadParcial}, reservada_activa=${cantidadReservadaActiva}, disponible_calculado=${availableInLote}, total_acumulado=${productData.totalAvailable}`,
        );

        // Calculate partial returns from reservations
        if (lote.reservas) {
          console.log(
            `Lote ${lote.id} has ${lote.reservas.length} reservations`,
          );
          for (const reserva of lote.reservas) {
            if (reserva.cantidadDevuelta && reserva.cantidadDevuelta > 0) {
              productData.totalPartialReturns += reserva.cantidadDevuelta;
              productData.hasPartialReturns = true;
              console.log(
                `Reservation ${reserva.id}: devuelta ${reserva.cantidadDevuelta}`,
              );
            }
          }
        } else {
          console.log(`Lote ${lote.id} has no reservations`);
        }
      }

      console.log(`Product map has ${productMap.size} products`);
      // Convert to array and sort: products with partial returns first
      const products = Array.from(productMap.values()).sort((a, b) => {
        if (a.hasPartialReturns && !b.hasPartialReturns) return -1;
        if (!a.hasPartialReturns && b.hasPartialReturns) return 1;
        return 0;
      });

      console.log(`Returning ${products.length} products`);
      // Return in frontend-friendly format
      const result = products.map((item) => {
        console.log(`Mapping product ${item.product.id}`);
        return {
          id: item.product.id,
          nombre: item.product.nombre,
          descripcion: item.product.descripcion,
          sku: item.product.sku,
          precioCompra: item.product.precioCompra,
          esDivisible: item.product.categoria?.esDivisible,
          capacidadPresentacion: item.product.capacidadPresentacion,
          categoria: item.product.categoria,
          unidadMedida: item.product.unidadMedida,
          cantidadDisponible: item.totalAvailable,
          stock_devuelto: item.totalPartialReturns,
          stock_sobrante: item.totalPartialReturns, // Assuming surplus is the partial returns available
          tieneDevolucionesParciales: item.hasPartialReturns,
        };
      });
      console.log('getAvailableProducts completed successfully');
      return result;
    } catch (error) {
      console.error('Error in getAvailableProducts:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }
}
