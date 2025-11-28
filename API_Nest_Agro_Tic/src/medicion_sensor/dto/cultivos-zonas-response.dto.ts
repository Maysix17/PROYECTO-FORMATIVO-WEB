import { Expose } from 'class-transformer';

export class CultivosZonasResponseDto {
  @Expose()
  cultivoId: string;

  @Expose()
  cultivoNombre: string;

  @Expose()
  variedadNombre: string;

  @Expose()
  tipoCultivoNombre: string;

  @Expose()
  zonaId: string;

  @Expose()
  zonaNombre: string;

  @Expose()
  cvzId: string;

  @Expose()
  estadoCultivo: number;

  @Expose()
  fechaSiembra: Date;
}
