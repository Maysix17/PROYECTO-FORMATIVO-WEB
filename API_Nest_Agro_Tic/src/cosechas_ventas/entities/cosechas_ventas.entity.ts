import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cosecha } from '../../cosechas/entities/cosecha.entity';
import { Venta } from '../../venta/entities/venta.entity';

@Entity('cosechas_ventas')
export class CosechasVentas {
  @PrimaryGeneratedColumn('uuid', { name: 'pk_id_cosechas_ventas' })
  id: string;

  @Column({ name: 'fk_id_cosecha' })
  fkCosechaId: string;

  @Column({ name: 'fk_id_venta' })
  fkVentaId: string;

  @Column({
    name: 'cv_cantidad_vendida',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  cantidadVendida: number;

  @ManyToOne(() => Cosecha, (cosecha) => cosecha.cosechasVentas)
  @JoinColumn({ name: 'fk_id_cosecha' })
  cosecha: Cosecha;

  @ManyToOne(() => Venta, (venta) => venta.cosechasVentas)
  @JoinColumn({ name: 'fk_id_venta' })
  venta: Venta;
}
