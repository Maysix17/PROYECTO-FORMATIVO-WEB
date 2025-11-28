import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CultivosVariedadXZona } from '../../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';

@Entity('estados_fenologicos')
export class EstadoFenologico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'integer' })
  orden: number;

  @OneToMany(() => CultivosVariedadXZona, (cvz) => cvz.estadoFenologico)
  cultivosVariedadXZona?: CultivosVariedadXZona[];
}
