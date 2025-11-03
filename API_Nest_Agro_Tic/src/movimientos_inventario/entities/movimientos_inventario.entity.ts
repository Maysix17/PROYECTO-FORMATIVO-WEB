import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LotesInventario } from '../../lotes_inventario/entities/lotes_inventario.entity';
import { ReservasXActividad } from '../../reservas_x_actividad/entities/reservas_x_actividad.entity';
import { TipoMovimiento } from '../../tipos_movimiento/entities/tipos_movimiento.entity';

@Entity('movimientos_inventario')
export class MovimientosInventario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fk_lote_id', type: 'uuid' })
  fkLoteId: string;

  @Column({ name: 'fk_reserva_id', type: 'uuid', nullable: true })
  fkReservaId?: string;

  @Column({ name: 'fk_tipo_movimiento_id', type: 'int' })
  fkTipoMovimientoId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({
    name: 'fecha_movimiento',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaMovimiento: Date;

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsable?: string;

  @ManyToOne(() => LotesInventario)
  @JoinColumn({ name: 'fk_lote_id' })
  lote?: LotesInventario;

  @ManyToOne(() => ReservasXActividad, undefined, { nullable: true })
  @JoinColumn({ name: 'fk_reserva_id' })
  reserva?: ReservasXActividad;

  @ManyToOne(() => TipoMovimiento)
  @JoinColumn({ name: 'fk_tipo_movimiento_id' })
  tipoMovimiento?: TipoMovimiento;
}
