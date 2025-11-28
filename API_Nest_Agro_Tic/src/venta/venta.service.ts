import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { Cosecha } from '../cosechas/entities/cosecha.entity';
import { CosechasVentas } from '../cosechas_ventas/entities/cosechas_ventas.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import {
  convertirPrecioAKilo,
  convertirAKilos,
  convertirALibras,
} from '../utils/conversion-unidades.util';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class VentaService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Cosecha)
    private readonly cosechaRepository: Repository<Cosecha>,
    @InjectRepository(CosechasVentas)
    private readonly cosechasVentasRepository: Repository<CosechasVentas>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(createVentaDto: CreateVentaDto): Promise<Venta> {
    // Set default date if not provided or empty
    if (!createVentaDto.fecha || createVentaDto.fecha.trim() === '') {
      createVentaDto.fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // Handle multiple harvest sales
    if (
      createVentaDto.multipleHarvests &&
      createVentaDto.multipleHarvests.length > 0
    ) {
      const venta = await this.createMultipleHarvestSale(createVentaDto);
      // Emit WebSocket notification for new sale
      this.emitSaleNotification(venta);
      return venta;
    }

    // Single harvest sale (existing logic)
    const venta = await this.createSingleHarvestSale(createVentaDto);
    // Emit WebSocket notification for new sale
    this.emitSaleNotification(venta);
    return venta;
  }

  private async createSingleHarvestSale(
    createVentaDto: CreateVentaDto,
  ): Promise<Venta> {
    // Validate that there's enough quantity available in the harvest
    const cosecha = await this.cosechaRepository.findOne({
      where: { id: createVentaDto.fkCosechaId },
      relations: ['cosechasVentas'],
    });

    if (!cosecha) {
      throw new NotFoundException(
        `Cosecha con id ${createVentaDto.fkCosechaId} no encontrada`,
      );
    }

    // Calculate available quantity dynamically (cosechas are always in KG)
    const cantidadVendida =
      cosecha.cosechasVentas?.reduce(
        (total, cv) => total + parseFloat(cv.cantidadVendida.toString()),
        0,
      ) || 0;
    const cantidadDisponible =
      parseFloat(cosecha.cantidad.toString()) - cantidadVendida;

    // Convert requested quantity to KG for comparison
    const cantidadSolicitadaEnKg = convertirAKilos(
      createVentaDto.cantidad,
      createVentaDto.unidadMedida,
    );

    if (cantidadDisponible < cantidadSolicitadaEnKg) {
      throw new BadRequestException(
        `Cantidad insuficiente disponible. Disponible: ${cantidadDisponible} KG, Solicitado: ${cantidadSolicitadaEnKg} KG`,
      );
    }

    // Calculate precioKilo from unit price and unit
    const precioKilo = convertirPrecioAKilo(
      createVentaDto.precioUnitario,
      createVentaDto.unidadMedida,
    );

    // Convert sale quantity to KG for inventory tracking
    const cantidadEnKg = convertirAKilos(
      createVentaDto.cantidad,
      createVentaDto.unidadMedida,
    );

    // Create the sale
    const venta = this.ventaRepository.create({
      cantidad: createVentaDto.cantidad, // Keep original quantity for display
      fecha: createVentaDto.fecha,
      fkCosechaId: createVentaDto.fkCosechaId,
      unidadMedida: createVentaDto.unidadMedida,
      precioUnitario: createVentaDto.precioUnitario,
      precioKilo: precioKilo,
    });

    const savedVenta = await this.ventaRepository.save(venta);

    // Create the relationship record for single harvest sale
    // Store the quantity in KG for inventory tracking
    const cantidadVendidaEnKg = convertirAKilos(
      createVentaDto.cantidad,
      createVentaDto.unidadMedida,
    );

    const cosechasVentas = this.cosechasVentasRepository.create({
      fkCosechaId: createVentaDto.fkCosechaId,
      fkVentaId: savedVenta.id,
      cantidadVendida: cantidadVendidaEnKg, // Always store in KG
    });

    await this.cosechasVentasRepository.save(cosechasVentas);

    // NOTE: Transient crops are no longer auto-finalized on sale.
    // They are only finalized when explicitly closed via "Cerrar venta de cosecha actual"
    // or when all harvests are closed and all produce is sold.
    // This check has been removed to prevent premature finalization.

    return savedVenta;
  }

  private async createMultipleHarvestSale(
    createVentaDto: CreateVentaDto,
  ): Promise<Venta> {
    const { multipleHarvests, cantidad: totalCantidad } = createVentaDto;

    console.log(
      `[DEBUG] createMultipleHarvestSale - Total cantidad a vender: ${totalCantidad}`,
    );
    console.log(
      `[DEBUG] createMultipleHarvestSale - Cosechas seleccionadas:`,
      multipleHarvests,
    );

    if (!multipleHarvests || multipleHarvests.length === 0) {
      throw new BadRequestException(
        'No se especificaron cosechas para la venta múltiple',
      );
    }

    // Calculate total available quantity from selected harvests
    let totalDisponible = 0;
    const cosechasData: Array<{
      cosecha: Cosecha;
      disponible: number;
      solicitado: number;
      solicitadoEnKg: number;
    }> = [];

    for (const harvest of multipleHarvests) {
      const cosecha = await this.cosechaRepository.findOne({
        where: { id: harvest.id },
        relations: ['cosechasVentas'],
      });

      if (!cosecha) {
        throw new NotFoundException(
          `Cosecha con id ${harvest.id} no encontrada`,
        );
      }

      if (cosecha.cerrado) {
        throw new BadRequestException(
          `La cosecha ${harvest.id} está cerrada y no se puede vender`,
        );
      }

      const cantidadVendida =
        cosecha.cosechasVentas?.reduce(
          (total, cv) => total + parseFloat(cv.cantidadVendida.toString()),
          0,
        ) || 0;
      const cantidadDisponible =
        parseFloat(cosecha.cantidad.toString()) - cantidadVendida;

      // Convert requested quantity to KG for comparison
      const solicitadoEnKg = convertirAKilos(
        harvest.cantidad,
        createVentaDto.unidadMedida,
      );

      console.log(`[DEBUG] Cosecha ${harvest.id} en venta múltiple:`);
      console.log(`  - Cantidad total: ${cosecha.cantidad} KG`);
      console.log(`  - Cantidad vendida: ${cantidadVendida} KG`);
      console.log(`  - Cantidad disponible: ${cantidadDisponible} KG`);
      console.log(
        `  - Cantidad solicitada: ${harvest.cantidad} ${createVentaDto.unidadMedida} (${solicitadoEnKg} KG)`,
      );
      console.log(
        `  - Ventas registradas:`,
        cosecha.cosechasVentas?.map((cv) => ({
          id: cv.id,
          cantidad: cv.cantidadVendida,
        })) || [],
      );

      cosechasData.push({
        cosecha,
        disponible: cantidadDisponible,
        solicitado: harvest.cantidad,
        solicitadoEnKg: solicitadoEnKg,
      });

      totalDisponible += cantidadDisponible;
    }

    console.log(
      `[DEBUG] Total disponible en todas las cosechas seleccionadas: ${totalDisponible} KG`,
    );
    console.log(
      `[DEBUG] Total solicitado: ${convertirAKilos(totalCantidad, createVentaDto.unidadMedida)} KG`,
    );

    // Convert total requested quantity to KG for comparison
    const totalCantidadEnKg = convertirAKilos(
      totalCantidad,
      createVentaDto.unidadMedida,
    );

    if (totalDisponible < totalCantidadEnKg) {
      throw new BadRequestException(
        `Cantidad insuficiente en las cosechas seleccionadas. Disponible total: ${totalDisponible} KG, Solicitado: ${totalCantidadEnKg} KG`,
      );
    }

    // Calculate precioKilo from unit price and unit
    const precioKilo = convertirPrecioAKilo(
      createVentaDto.precioUnitario,
      createVentaDto.unidadMedida,
    );

    // Create the main sale record (use first harvest as reference)
    const venta = this.ventaRepository.create({
      cantidad: totalCantidad,
      fecha: createVentaDto.fecha,
      fkCosechaId: multipleHarvests[0].id, // Use first harvest as reference
      unidadMedida: createVentaDto.unidadMedida,
      precioUnitario: createVentaDto.precioUnitario,
      precioKilo: precioKilo,
    });

    const savedVenta = await this.ventaRepository.save(venta);

    // Convert total quantity to KG for distribution
    const totalCantidadEnKgParaDistribucion = convertirAKilos(
      totalCantidad,
      createVentaDto.unidadMedida,
    );

    // Distribute the sale across harvests using FIFO logic
    await this.distributeSaleAcrossHarvests(
      savedVenta,
      cosechasData,
      totalCantidad,
    );

    // NOTE: Transient crops are no longer auto-finalized on sale.
    // They are only finalized when explicitly closed via "Cerrar venta de cosecha actual"
    // or when all harvests are closed and all produce is sold.
    // This check has been removed to prevent premature finalization.

    return savedVenta;
  }

  private async distributeSaleAcrossHarvests(
    venta: Venta,
    cosechasData: Array<{
      cosecha: Cosecha;
      disponible: number;
      solicitado: number;
      solicitadoEnKg: number;
    }>,
    totalCantidad: number,
  ): Promise<void> {
    // Convert total quantity to KG for distribution
    const totalCantidadEnKgDistribucion = convertirAKilos(
      totalCantidad,
      venta.unidadMedida,
    );
    let remainingQuantity = totalCantidadEnKgDistribucion;

    console.log(
      `[DEBUG] distributeSaleAcrossHarvests - Total cantidad a distribuir: ${totalCantidad}`,
    );
    console.log(
      `[DEBUG] distributeSaleAcrossHarvests - Cosechas antes de ordenar:`,
      cosechasData.map((d) => ({
        id: d.cosecha.id,
        fecha: d.cosecha.fecha,
        disponible: d.disponible,
      })),
    );

    // Sort by harvest date (FIFO: oldest first)
    cosechasData.sort((a, b) => {
      const dateA = a.cosecha.fecha ? new Date(a.cosecha.fecha).getTime() : 0;
      const dateB = b.cosecha.fecha ? new Date(b.cosecha.fecha).getTime() : 0;
      return dateA - dateB;
    });

    console.log(
      `[DEBUG] distributeSaleAcrossHarvests - Cosechas después de ordenar (FIFO):`,
      cosechasData.map((d) => ({
        id: d.cosecha.id,
        fecha: d.cosecha.fecha,
        disponible: d.disponible,
      })),
    );

    for (const data of cosechasData) {
      if (remainingQuantity <= 0) break;

      const quantityToTake = Math.min(remainingQuantity, data.disponible);

      console.log(`[DEBUG] Procesando cosecha ${data.cosecha.id}:`);
      console.log(`  - Cantidad restante por distribuir: ${remainingQuantity}`);
      console.log(
        `  - Cantidad disponible en esta cosecha: ${data.disponible}`,
      );
      console.log(`  - Cantidad a tomar: ${quantityToTake}`);

      if (quantityToTake > 0) {
        const cosechasVentas = this.cosechasVentasRepository.create({
          fkCosechaId: data.cosecha.id,
          fkVentaId: venta.id,
          cantidadVendida: quantityToTake,
        });

        await this.cosechasVentasRepository.save(cosechasVentas);
        remainingQuantity -= quantityToTake;

        console.log(
          `  - Registrada venta de ${quantityToTake} en cosecha ${data.cosecha.id}`,
        );
        console.log(
          `  - Cantidad restante por distribuir ahora: ${remainingQuantity}`,
        );
      }
    }

    console.log(
      `[DEBUG] Distribución completada. Cantidad restante sin distribuir: ${remainingQuantity}`,
    );
  }

  private emitSaleNotification(venta: Venta): void {
    console.log(`[DEBUG] Emitting sale notification for venta: ${venta.id}`);
    this.notificationsGateway.emitNotificationToAll({
      type: 'new_sale',
      data: venta,
      message: 'Nueva venta registrada',
    });
  }

  async findAll(): Promise<Venta[]> {
    return await this.ventaRepository.find();
  }

  async findOne(id: string): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({ where: { id } });
    if (!venta) {
      throw new NotFoundException(`Venta con id ${id} no encontrada`);
    }
    return venta;
  }

  async update(id: string, updateVentaDto: UpdateVentaDto): Promise<Venta> {
    const venta = await this.findOne(id);
    Object.assign(venta, updateVentaDto);
    return await this.ventaRepository.save(venta);
  }

  async remove(id: string): Promise<void> {
    const venta = await this.findOne(id);
    await this.ventaRepository.remove(venta);
  }
}
