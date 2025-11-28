import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cosecha } from './entities/cosecha.entity';
import { CreateCosechaDto } from './dto/create-cosecha.dto';
import { UpdateCosechaDto } from './dto/update-cosecha.dto';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { CultivosVariedadXZona } from '../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';
import { CultivosXVariedad } from '../cultivos_x_variedad/entities/cultivos_x_variedad.entity';
import { Variedad } from '../variedad/entities/variedad.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class CosechasService {
  constructor(
    @InjectRepository(Cosecha)
    private readonly cosechaRepository: Repository<Cosecha>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepository: Repository<Cultivo>,
    @InjectRepository(CultivosVariedadXZona)
    private readonly cvzRepository: Repository<CultivosVariedadXZona>,
    @InjectRepository(CultivosXVariedad)
    private readonly cxvRepository: Repository<CultivosXVariedad>,
    @InjectRepository(Variedad)
    private readonly variedadRepository: Repository<Variedad>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(createCosechaDto: CreateCosechaDto): Promise<Cosecha> {
    // Set default date if not provided or empty
    if (!createCosechaDto.fecha || createCosechaDto.fecha.trim() === '') {
      createCosechaDto.fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // Calcular rendimiento por planta si se proporciona cantidad de plantas cosechadas
    if (
      createCosechaDto.cantidad_plantas_cosechadas &&
      createCosechaDto.cantidad_plantas_cosechadas > 0
    ) {
      (createCosechaDto as any).rendimientoPorPlanta =
        createCosechaDto.cantidad /
        createCosechaDto.cantidad_plantas_cosechadas;
    }

    const cosecha = this.cosechaRepository.create({
      ...createCosechaDto,
      cantidadPlantasCosechadas: createCosechaDto.cantidad_plantas_cosechadas,
      rendimientoPorPlanta: (createCosechaDto as any).rendimientoPorPlanta,
      cerrado: false,
    });
    const savedCosecha = await this.cosechaRepository.save(cosecha);

    // Emit WebSocket notification for new harvest
    this.emitHarvestNotification(savedCosecha);

    // NOTE: Transitorio crops are no longer auto-finalized on harvest.
    // They remain active until "Cerrar venta de cosecha actual" is pressed,
    // which will finalize the crop.

    return savedCosecha;
  }

  async findAll(): Promise<Cosecha[]> {
    return await this.cosechaRepository.find({
      relations: [
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivosVariedadXZona.zona',
      ],
    });
  }

  async findAllToday(): Promise<Cosecha[]> {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    return await this.cosechaRepository.find({
      where: {
        fecha: todayString,
      },
      relations: [
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivosVariedadXZona.zona',
      ],
    });
  }

  async findOne(id: string): Promise<Cosecha> {
    const cosecha = await this.cosechaRepository.findOne({
      where: { id },
      relations: [
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivosVariedadXZona.zona',
      ],
    });
    if (!cosecha) {
      throw new NotFoundException(`Cosecha con id ${id} no encontrada`);
    }
    return cosecha;
  }

  async update(
    id: string,
    updateCosechaDto: UpdateCosechaDto,
  ): Promise<Cosecha> {
    const cosecha = await this.findOne(id);
    Object.assign(cosecha, updateCosechaDto);
    return await this.cosechaRepository.save(cosecha);
  }

  async remove(id: string): Promise<void> {
    const cosecha = await this.findOne(id);
    await this.cosechaRepository.remove(cosecha);
  }

  async closeHarvest(id: string): Promise<Cosecha> {
    const cosecha = await this.findOne(id);
    cosecha.cerrado = true;
    return await this.cosechaRepository.save(cosecha);
  }

  async closeHarvestSales(id: string): Promise<Cosecha> {
    const cosecha = await this.cosechaRepository.findOne({
      where: { id },
      relations: ['cosechasVentas'],
    });

    if (!cosecha) {
      throw new NotFoundException(`Cosecha con id ${id} no encontrada`);
    }

    // Verificar si hay ventas activas para esta cosecha
    const hasActiveSales =
      cosecha.cosechasVentas && cosecha.cosechasVentas.length > 0;

    if (!hasActiveSales) {
      throw new BadRequestException(
        `La cosecha ${id} no tiene ventas activas para cerrar`,
      );
    }

    // Marcar la cosecha como cerrada para ventas (esto previene nuevas ventas)
    cosecha.cerrado = true;
    return await this.cosechaRepository.save(cosecha);
  }

  async closeAllHarvestSalesByCultivo(cvzId: string): Promise<Cosecha[]> {
    console.log(
      `[DEBUG] closeAllHarvestSalesByCultivo called for cvzId: ${cvzId}`,
    );

    // Buscar todas las cosechas del cultivo que no estén cerradas y que tengan ventas
    const cosechasConVentas = await this.cosechaRepository.find({
      where: {
        fkCultivosVariedadXZonaId: cvzId,
        cerrado: false,
      },
      relations: [
        'cosechasVentas',
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivosVariedadXZona.cultivoXVariedad.cultivo',
      ],
    });

    console.log(
      `[DEBUG] Found ${cosechasConVentas.length} open harvests for cvzId: ${cvzId}`,
    );

    // Filtrar solo las que tienen ventas activas
    const cosechasAbiertasConVentas = cosechasConVentas.filter(
      (cosecha) => cosecha.cosechasVentas && cosecha.cosechasVentas.length > 0,
    );

    console.log(
      `[DEBUG] Found ${cosechasAbiertasConVentas.length} open harvests with sales for cvzId: ${cvzId}`,
    );

    if (cosechasAbiertasConVentas.length === 0) {
      throw new BadRequestException(
        `No hay cosechas abiertas con ventas activas para cerrar en el cultivo ${cvzId}`,
      );
    }

    // Marcar todas las cosechas como cerradas
    const cosechasCerradas = cosechasAbiertasConVentas.map((cosecha) => {
      cosecha.cerrado = true;
      return cosecha;
    });

    // Guardar los cambios
    const savedCosechas = await this.cosechaRepository.save(cosechasCerradas);

    // NOTE: Removed auto-finalization logic. Transient crops should only be finalized
    // when explicitly requested via "Cerrar venta de cosecha actual" button in frontend.
    // This prevents premature finalization when registering sales.

    return savedCosechas;
  }

  async getCantidadDisponible(id: string): Promise<number> {
    const cosecha = await this.cosechaRepository.findOne({
      where: { id },
      relations: ['cosechasVentas'],
    });

    if (!cosecha) {
      throw new NotFoundException(`Cosecha con id ${id} no encontrada`);
    }

    // Calcular cantidad vendida dinámicamente desde la tabla intermedia
    const cantidadVendida =
      cosecha.cosechasVentas?.reduce(
        (total, cv) => total + parseFloat(cv.cantidadVendida.toString()),
        0,
      ) || 0;

    // Cantidad disponible = cantidad cosechada - cantidad vendida
    return parseFloat(cosecha.cantidad.toString()) - cantidadVendida;
  }

  async findAllWithDisponible(): Promise<Cosecha[]> {
    const cosechas = await this.cosechaRepository.find({
      relations: [
        'cosechasVentas',
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
      ],
    });

    // Calcular cantidad disponible dinámicamente para cada cosecha
    return cosechas.map((cosecha) => {
      const cantidadVendida =
        cosecha.cosechasVentas?.reduce(
          (total, cv) => total + parseFloat(cv.cantidadVendida.toString()),
          0,
        ) || 0;
      (cosecha as any).cantidadDisponible =
        parseFloat(cosecha.cantidad.toString()) - cantidadVendida;
      return cosecha;
    });
  }

  async getCosechasByCultivo(cvzId: string): Promise<Cosecha[]> {
    const cosechas = await this.cosechaRepository.find({
      where: { fkCultivosVariedadXZonaId: cvzId },
      relations: [
        'cosechasVentas',
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
      ],
    });

    // Calcular cantidad disponible dinámicamente para cada cosecha
    return cosechas.map((cosecha) => {
      const cantidadVendida =
        cosecha.cosechasVentas?.reduce(
          (total, cv) => total + parseFloat(cv.cantidadVendida.toString()),
          0,
        ) || 0;
      const cantidadDisponible =
        parseFloat(cosecha.cantidad.toString()) - cantidadVendida;
      (cosecha as any).cantidadDisponible = cantidadDisponible;

      // DEBUG: Imprimir cálculo de cantidad disponible
      console.log(`[DEBUG] Cosecha ${cosecha.id}:`);
      console.log(
        `  - Cantidad total: ${cosecha.cantidad} (tipo: ${typeof cosecha.cantidad})`,
      );
      console.log(
        `  - Cantidad vendida: ${cantidadVendida} (tipo: ${typeof cantidadVendida})`,
      );
      console.log(
        `  - Cantidad disponible: ${cantidadDisponible} (tipo: ${typeof cantidadDisponible})`,
      );
      console.log(
        `  - Ventas registradas:`,
        cosecha.cosechasVentas?.map((cv) => ({
          id: cv.id,
          cantidad: cv.cantidadVendida,
          tipo: typeof cv.cantidadVendida,
        })) || [],
      );

      return cosecha;
    });
  }

  async getCosechasAbiertasByCultivo(cvzId: string): Promise<Cosecha[]> {
    console.log(
      `[DEBUG] getCosechasAbiertasByCultivo llamado para cvzId: ${cvzId}`,
    );

    const cosechas = await this.cosechaRepository.find({
      where: {
        fkCultivosVariedadXZonaId: cvzId,
        cerrado: false,
      },
      relations: [
        'cosechasVentas',
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
      ],
    });

    console.log(`[DEBUG] Cosechas encontradas (abiertas): ${cosechas.length}`);

    // Calcular cantidad disponible dinámicamente para cada cosecha abierta
    return cosechas.map((cosecha) => {
      const cantidadVendida =
        cosecha.cosechasVentas?.reduce(
          (total, cv) => total + parseFloat(cv.cantidadVendida.toString()),
          0,
        ) || 0;
      const cantidadDisponible =
        parseFloat(cosecha.cantidad.toString()) - cantidadVendida;
      (cosecha as any).cantidadDisponible = cantidadDisponible;

      // DEBUG: Imprimir cálculo de cantidad disponible para cosechas abiertas
      console.log(`[DEBUG] Cosecha ABIERTA ${cosecha.id}:`);
      console.log(
        `  - Cantidad total: ${cosecha.cantidad} (tipo: ${typeof cosecha.cantidad})`,
      );
      console.log(
        `  - Cantidad vendida: ${cantidadVendida} (tipo: ${typeof cantidadVendida})`,
      );
      console.log(
        `  - Cantidad disponible: ${cantidadDisponible} (tipo: ${typeof cantidadDisponible})`,
      );
      console.log(`  - Estado cerrado: ${cosecha.cerrado}`);
      console.log(
        `  - Ventas registradas:`,
        cosecha.cosechasVentas?.map((cv) => ({
          id: cv.id,
          cantidad: cv.cantidadVendida,
          tipo: typeof cv.cantidadVendida,
        })) || [],
      );

      return cosecha;
    });
  }

  async closeAllHarvestsByCultivo(cvzId: string): Promise<Cosecha[]> {
    // Buscar todas las cosechas del cultivo que no estén cerradas
    const cosechasAbiertas = await this.cosechaRepository.find({
      where: {
        fkCultivosVariedadXZonaId: cvzId,
        cerrado: false,
      },
    });

    if (cosechasAbiertas.length === 0) {
      throw new BadRequestException(
        `No hay cosechas abiertas para cerrar en el cultivo ${cvzId}`,
      );
    }

    // Marcar todas las cosechas como cerradas
    const cosechasCerradas = cosechasAbiertas.map((cosecha) => {
      cosecha.cerrado = true;
      return cosecha;
    });

    // Guardar los cambios
    return await this.cosechaRepository.save(cosechasCerradas);
  }

  private emitHarvestNotification(cosecha: Cosecha): void {
    console.log(
      `[DEBUG] Emitting harvest notification for cosecha: ${cosecha.id}`,
    );
    this.notificationsGateway.emitNotificationToAll({
      type: 'new_harvest',
      data: cosecha,
      message: 'Nueva cosecha registrada',
    });
  }
}
