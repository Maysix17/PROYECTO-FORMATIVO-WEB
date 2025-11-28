import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Categoria } from '../../categoria/entities/categoria.entity';
import { UnidadMedida } from '../../unidades_medida/entities/unidades_medida.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioCompra: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '1.00' })
  capacidadPresentacion: number;

  @Column({ name: 'fk_categoria_id' })
  fkCategoriaId: string;

  @Column({ name: 'fk_unidad_medida_id' })
  fkUnidadMedidaId: string;

  @Column({ name: 'img_url', type: 'varchar', length: 255, nullable: true })
  imgUrl?: string;

  @Column({
    name: 'vida_util_promedio_por_usos',
    type: 'int',
    nullable: true,
    comment:
      'Vida útil promedio en usos para productos no divisibles (herramientas)',
  })
  vidaUtilPromedioPorUsos?: number;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'fk_categoria_id' })
  categoria?: Categoria;

  @ManyToOne(() => UnidadMedida)
  @JoinColumn({ name: 'fk_unidad_medida_id' })
  unidadMedida?: UnidadMedida;
}
