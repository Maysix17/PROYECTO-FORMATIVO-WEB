// File: src/entities/actividades/actividades.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CultivosVariedadXZona } from '../../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';
import { UsuarioXActividad } from '../../usuarios_x_actividades/entities/usuarios_x_actividades.entity';
import { CategoriaActividad } from '../../categoria_actividad/entities/categoria_actividad.entity';
import { ReservasXActividad } from '../../reservas_x_actividad/entities/reservas_x_actividad.entity';

@Entity('actividades')
export class Actividad {
  @PrimaryGeneratedColumn('uuid', { name: 'pk_id_actividad' })
  id: string;

  @Column({ name: 'act_descripcion', type: 'text' })
  descripcion: string;

  @Column({ name: 'act_fecha_asignacion', type: 'date' })
  fechaAsignacion: Date;

  @Column({
    name: 'act_horas_dedicadas',
    type: 'numeric',
    nullable: true,
    default: null,
  })
  horasDedicadas?: number;

  @Column({ name: 'act_precio_hora', type: 'numeric', nullable: true })
  precioHora?: number;

  @Column({
    name: 'act_observacion',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  observacion?: string;

  @Column({
    name: 'act_estado',
    type: 'boolean',
    nullable: true,
    default: true,
  })
  estado?: boolean;

  @Column({
    name: 'act_fecha_finalizacion',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  fechaFinalizacion?: Date;

  @Column({
    name: 'act_img_url',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  imgUrl?: string;

  @Column({ name: 'fk_id_cultivo_variedad_x_zona' })
  fkCultivoVariedadZonaId: string;

  @Column({ name: 'fk_id_categoria_actividad', type: 'uuid' })
  fkCategoriaActividadId: string;

  @Column({ name: 'act_dni_responsable', type: 'bigint' })
  dniResponsable: number;

  @ManyToOne(() => CultivosVariedadXZona, (cvz) => cvz.actividades)
  @JoinColumn({ name: 'fk_id_cultivo_variedad_x_zona' })
  cultivoVariedadZona?: CultivosVariedadXZona;

  @ManyToOne(() => CategoriaActividad, (ca) => ca.actividades)
  @JoinColumn({ name: 'fk_id_categoria_actividad' })
  categoriaActividad?: CategoriaActividad;

  @OneToMany(() => UsuarioXActividad, (uxa) => uxa.actividad)
  usuariosAsignados?: UsuarioXActividad[];

  @OneToMany(() => ReservasXActividad, (r) => r.actividad)
  reservas?: ReservasXActividad[];
}
