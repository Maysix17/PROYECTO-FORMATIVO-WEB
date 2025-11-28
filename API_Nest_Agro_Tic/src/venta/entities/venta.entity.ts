// File: src/entities/venta/venta.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Cosecha } from '../../cosechas/entities/cosecha.entity';
import { CosechasVentas } from '../../cosechas_ventas/entities/cosechas_ventas.entity';

@Entity('venta')
export class Venta {
  @PrimaryGeneratedColumn('uuid', { name: 'pk_id_venta' })
  id: string;

  @Column({ name: 'ven_cantidad', type: 'numeric', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ name: 'ven_fecha', type: 'date' })
  fecha: string;

  @Column({ name: 'fk_id_cosecha' })
  fkCosechaId: string;

  @Column({ name: 'ven_unidad_medida', type: 'varchar', length: 2 })
  unidadMedida: string;

  @Column({
    name: 'ven_precio_unitario',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  precioUnitario: number;

  @Column({ name: 'ven_precio_kilo', type: 'numeric', precision: 10, scale: 2 })
  precioKilo: number;

  @ManyToOne(() => Cosecha, (c) => c.ventas)
  @JoinColumn({ name: 'fk_id_cosecha' })
  cosecha?: Cosecha;

  @OneToMany(() => CosechasVentas, (cv) => cv.venta)
  cosechasVentas?: CosechasVentas[];
}
