import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cultivo } from './entities/cultivo.entity';
import { CultivosVariedadXZona } from '../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';
import { CultivosXVariedad } from '../cultivos_x_variedad/entities/cultivos_x_variedad.entity';
import { Variedad } from '../variedad/entities/variedad.entity';
import { Zona } from '../zonas/entities/zona.entity';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { UpdateCultivoDto } from './dto/update-cultivo.dto';
import { SearchCultivoDto } from './dto/search-cultivo.dto';

@Injectable()
export class CultivosService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly cultivoRepo: Repository<Cultivo>,
    @InjectRepository(CultivosVariedadXZona)
    private readonly cvzRepo: Repository<CultivosVariedadXZona>,
    @InjectRepository(CultivosXVariedad)
    private readonly cxvRepo: Repository<CultivosXVariedad>,
    @InjectRepository(Variedad)
    private readonly variedadRepo: Repository<Variedad>,
    @InjectRepository(Zona)
    private readonly zonaRepo: Repository<Zona>,
  ) {}

  async create(dto: CreateCultivoDto): Promise<Cultivo> {
    // Validate variedad exists and belongs to tipoCultivo
    const variedad = await this.variedadRepo.findOne({
      where: { id: dto.variedadId },
      relations: ['tipoCultivo'],
    });
    if (!variedad) {
      throw new NotFoundException(
        `Variedad con id ${dto.variedadId} no encontrada`,
      );
    }
    if (variedad.fkTipoCultivoId !== dto.tipoCultivoId) {
      throw new NotFoundException(
        `Variedad no pertenece al tipo de cultivo especificado`,
      );
    }

    // Validate zona exists
    const zona = await this.zonaRepo.findOne({ where: { id: dto.zonaId } });
    if (!zona) {
      throw new NotFoundException(`Zona con id ${dto.zonaId} no encontrada`);
    }

    // Create Cultivo
    const cultivo = this.cultivoRepo.create({
      estado: dto.estado,
      siembra: dto.siembra,
    });
    const savedCultivo = await this.cultivoRepo.save(cultivo);

    // Create CultivosXVariedad
    const cxv = this.cxvRepo.create({
      fkCultivoId: savedCultivo.id,
      fkVariedadId: dto.variedadId,
    });
    const savedCxv = await this.cxvRepo.save(cxv);

    // Create CultivosVariedadXZona
    const cvz = this.cvzRepo.create({
      fkCultivosXVariedadId: savedCxv.id,
      fkZonaId: dto.zonaId,
      cantidadPlantasInicial: dto.cantidad_plantas_inicial || 0,
      cantidadPlantasActual: dto.cantidad_plantas_inicial || 0,
      fkEstadoFenologicoId: dto.fk_estado_fenologico || 1,
    });
    const savedCvz = await this.cvzRepo.save(cvz);
    console.log('🌱 CULTIVOS SERVICE - CVZ creado:', {
      id: savedCvz.id,
      cantidadPlantasInicial: savedCvz.cantidadPlantasInicial,
      cantidadPlantasActual: savedCvz.cantidadPlantasActual,
      fkEstadoFenologicoId: savedCvz.fkEstadoFenologicoId,
    });

    return savedCultivo;
  } /**
   * NOTA: Esta función fue simplificada para usar la lógica de búsqueda,
   * la cual es más robusta. Solo llama a 'search' sin filtros.
   */

  async findAll(): Promise<any[]> {
    return this.search({});
  }

  async findOne(id: string): Promise<Cultivo> {
    const cultivo = await this.cultivoRepo.findOne({ where: { id } });
    if (!cultivo)
      throw new NotFoundException(`Cultivo con id ${id} no encontrado`);
    return cultivo;
  }

  async update(id: string, dto: UpdateCultivoDto): Promise<Cultivo> {
    const cultivo = await this.findOne(id);
    Object.assign(cultivo, dto);
    return await this.cultivoRepo.save(cultivo);
  }

  async remove(id: string): Promise<void> {
    const cultivo = await this.findOne(id);
    await this.cultivoRepo.remove(cultivo);
  }

  async search(dto: SearchCultivoDto): Promise<any[]> {
    try {
      // Query que muestra cultivos con CVZ asignado (para poder registrar cosechas)
      const qb = this.cvzRepo
        .createQueryBuilder('cvz')
        .leftJoin('cvz.cultivoXVariedad', 'cxv')
        .leftJoin('cxv.cultivo', 'c')
        .leftJoin('cxv.variedad', 'v')
        .leftJoin('v.tipoCultivo', 'tc')
        .leftJoin('cvz.zona', 'z')
        .leftJoin('cvz.actividades', 'a')
        .leftJoin('a.usuariosAsignados', 'uxa')
        .leftJoin('uxa.usuario', 'u')
        .leftJoin('u.ficha', 'f')
        .leftJoin('cvz.cosechas', 'cos')
        .leftJoin('cvz.estadoFenologico', 'ef');

      // Aplicar filtros
      if (dto.estado_cultivo !== undefined && dto.estado_cultivo !== null) {
        qb.andWhere('c.estado = :estado', { estado: dto.estado_cultivo });
      }

      if (dto.buscar && dto.buscar.trim()) {
        qb.andWhere('z.nombre ILIKE :buscar', { buscar: `%${dto.buscar}%` });
      }

      if (dto.buscar_cultivo && dto.buscar_cultivo.trim()) {
        qb.andWhere(
          '(v.var_nombre ILIKE :cultivo OR tc.tpc_nombre ILIKE :cultivo)',
          { cultivo: `%${dto.buscar_cultivo}%` },
        );
      }

      if (dto.fecha_inicio && dto.fecha_fin) {
        qb.andWhere('c.siembra BETWEEN :inicio AND :fin', {
          inicio: dto.fecha_inicio,
          fin: dto.fecha_fin,
        });
      }

      // Filtro por ficha se aplica después de obtener los resultados

      // Seleccionar campos con información completa
      qb.select([
        'cvz.id as cvzid',
        'c.id as id',
        "COALESCE(string_agg(distinct f.ficha_numero::text, ', '), 'Sin ficha') as ficha",
        "COALESCE(z.nombre, 'Sin zona') as lote",
        "COALESCE(v.var_nombre, 'Sin variedad') as nombrecultivo",
        'c.siembra as fechasiembra',
        'c.estado as estado',
        'MAX(cos.cos_fecha) as fechacosecha',
        'COUNT(cos.id) as numCosechas',
        '(SELECT cos2.pk_id_cosecha FROM cosechas cos2 WHERE cos2.fk_id_cultivos_variedad_x_zona = cvz.pk_id_cv_zona ORDER BY cos2.cos_fecha DESC LIMIT 1) as cosechaid',
        'cvz.cantidadPlantasInicial as cantidad_plantas_inicial',
        'cvz.cantidadPlantasActual as cantidad_plantas_actual',
        'cvz.fkEstadoFenologicoId as fk_estado_fenologico',
        'cvz.fechaActualizacion as fecha_actualizacion',
        'ef.nombre as estado_fenologico_nombre',
        'ef.descripcion as estado_fenologico_descripcion',
        'tc.tpc_nombre as tipo_cultivo_nombre',
        'tc.tpc_es_perenne as tipo_cultivo_es_perenne',
      ])
        .groupBy(
          'cvz.id, c.id, z.nombre, c.siembra, c.estado, v.var_nombre, ef.nombre, ef.descripcion, tc.tpc_nombre, tc.tpc_es_perenne',
        )
        .orderBy('cvz.id');

      console.log('Generated Query:', qb.getQuery());
      console.log('Query Parameters:', qb.getParameters());
      const result = await qb.getRawMany();
      console.log('Search result count before ficha filter:', result.length);
      console.log('Applied filters:', dto);
      console.log('First 3 results:', result.slice(0, 3));

      // Aplicar filtro por ficha después de obtener los resultados
      let filteredResult = result;
      if (dto.id_titulado && dto.id_titulado.trim()) {
        filteredResult = result.filter(
          (r) =>
            r.ficha &&
            r.ficha.toLowerCase().includes(dto.id_titulado!.toLowerCase()),
        );
        console.log(
          'Search result count after ficha filter:',
          filteredResult.length,
        );
      }

      return filteredResult;
    } catch (error) {
      console.error('Error en search:', error);
      // Devolver array vacío en caso de error para evitar crash
      return [];
    }
  }

  async finalize(id: string): Promise<Cultivo> {
    const cultivo = await this.findOne(id);
    cultivo.estado = 0; // Cambiar estado a finalizado
    return await this.cultivoRepo.save(cultivo);
  }
}
