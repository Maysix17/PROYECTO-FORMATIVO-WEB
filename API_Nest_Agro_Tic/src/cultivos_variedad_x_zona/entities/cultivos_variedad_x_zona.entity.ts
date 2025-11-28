// File: src/entities/cultivos_variedad_x_zona/cultivos_variedad_x_zona.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CultivosXVariedad } from '../../cultivos_x_variedad/entities/cultivos_x_variedad.entity';
import { Zona } from '../../zonas/entities/zona.entity';
import { Actividad } from '../../actividades/entities/actividades.entity';
import { Cosecha } from '../../cosechas/entities/cosecha.entity';
import { EstadoFenologico } from '../../estados_fenologicos/entities/estado_fenologico.entity';

@Entity('cultivos_variedad_x_zona')
export class CultivosVariedadXZona {
  @PrimaryGeneratedColumn('uuid', { name: 'pk_id_cv_zona' })
  id: string;

  @Column({ name: 'fk_id_cultivos_x_variedad' })
  fkCultivosXVariedadId: string;

  @Column({ name: 'fk_id_zona' })
  fkZonaId: string;

  // Nuevos campos para características del cultivo
  @Column({ name: 'cvz_cantidad_plantas_inicial', type: 'integer', default: 0 })
  cantidadPlantasInicial?: number;

  @Column({ name: 'cvz_cantidad_plantas_actual', type: 'integer', default: 0 })
  cantidadPlantasActual?: number;

  @Column({ name: 'fk_estado_fenologico', nullable: true })
  fkEstadoFenologicoId?: number;

  @Column({
    name: 'cvz_fecha_actualizacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion?: Date;

  @ManyToOne(() => CultivosXVariedad, (cxv) => cxv.zonas)
  @JoinColumn({ name: 'fk_id_cultivos_x_variedad' })
  cultivoXVariedad?: CultivosXVariedad;

  @ManyToOne(() => Zona, (z) => z.cultivosVariedad)
  @JoinColumn({ name: 'fk_id_zona' })
  zona?: Zona;

  @OneToMany(() => Actividad, (a) => a.cultivoVariedadZona)
  actividades?: Actividad[];

  @OneToMany(() => Cosecha, (c) => c.cultivosVariedadXZona)
  cosechas?: Cosecha[];

  @ManyToOne(() => EstadoFenologico, (ef) => ef.cultivosVariedadXZona)
  @JoinColumn({ name: 'fk_estado_fenologico' })
  estadoFenologico?: EstadoFenologico;
}
