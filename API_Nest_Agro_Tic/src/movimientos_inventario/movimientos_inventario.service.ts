import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientosInventario } from './entities/movimientos_inventario.entity';
import { CreateMovimientosInventarioDto } from './dto/create-movimientos_inventario.dto';
import { UpdateMovimientosInventarioDto } from './dto/update-movimientos_inventario.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class MovimientosInventarioService {
  constructor(
    @InjectRepository(MovimientosInventario)
    private readonly movimientosInventarioRepo: Repository<MovimientosInventario>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    createDto: CreateMovimientosInventarioDto,
  ): Promise<MovimientosInventario> {
    const entity = this.movimientosInventarioRepo.create(createDto);
    const savedEntity = await this.movimientosInventarioRepo.save(entity);

    const notification = {
      type: 'new_movement',
      message: 'Se ha creado un nuevo movimiento de inventario.',
    };

    this.notificationsGateway.emitNotificationToAll(notification);

    return savedEntity;
  }

  async findAll(): Promise<MovimientosInventario[]> {
    return await this.movimientosInventarioRepo.find({
      relations: [
        'lote',
        'lote.producto',
        'lote.producto.categoria',
        'lote.bodega',
        'reserva',
        'tipoMovimiento',
      ],
    });
  }

  async findOne(id: string): Promise<MovimientosInventario> {
    const entity = await this.movimientosInventarioRepo.findOne({
      where: { id },
      relations: ['lote', 'reserva', 'tipoMovimiento'],
    });
    if (!entity)
      throw new NotFoundException(
        `MovimientosInventario con ID ${id} no encontrado`,
      );
    return entity;
  }

  async update(
    id: string,
    updateDto: UpdateMovimientosInventarioDto,
  ): Promise<MovimientosInventario> {
    const entity = await this.findOne(id);
    Object.assign(entity, updateDto);
    return await this.movimientosInventarioRepo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.movimientosInventarioRepo.remove(entity);
  }

  async filter(
    startDate?: string,
    endDate?: string,
    productQuery?: string,
  ): Promise<MovimientosInventario[]> {
    const queryBuilder = this.movimientosInventarioRepo
      .createQueryBuilder('movimiento')
      .leftJoinAndSelect('movimiento.lote', 'lote')
      .leftJoinAndSelect('lote.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('lote.bodega', 'bodega')
      .leftJoinAndSelect('movimiento.reserva', 'reserva')
      .leftJoinAndSelect('movimiento.tipoMovimiento', 'tipoMovimiento')
      .orderBy('movimiento.fechaMovimiento', 'DESC');

    if (startDate) {
      queryBuilder.andWhere('movimiento.fechaMovimiento >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('movimiento.fechaMovimiento <= :endDate', {
        endDate: new Date(endDate + ' 23:59:59'),
      });
    }

    if (productQuery) {
      queryBuilder.andWhere(
        '(producto.nombre ILIKE :query OR producto.sku ILIKE :query)',
        { query: `%${productQuery}%` },
      );
    }

    return await queryBuilder.getMany();
  }
}
