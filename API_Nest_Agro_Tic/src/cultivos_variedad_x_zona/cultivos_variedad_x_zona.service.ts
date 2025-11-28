import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CultivosVariedadXZona } from './entities/cultivos_variedad_x_zona.entity';
import { CreateCultivosVariedadXZonaDto } from './dto/create-cultivos_variedad_x_zona.dto';
import { UpdateCultivosVariedadXZonaDto } from './dto/update-cultivos_variedad_x_zona.dto';
import { UpdateCantidadPlantasDto } from './dto/update-cantidad-plantas.dto';
import { UpdateEstadoFenologicoDto } from './dto/update-estado-fenologico.dto';

@Injectable()
export class CultivosVariedadXZonaService {
  constructor(
    @InjectRepository(CultivosVariedadXZona)
    private readonly cvzRepository: Repository<CultivosVariedadXZona>,
  ) {}

  async create(
    createCultivosVariedadXZonaDto: CreateCultivosVariedadXZonaDto,
  ): Promise<CultivosVariedadXZona> {
    const cvz = this.cvzRepository.create({
      ...createCultivosVariedadXZonaDto,
      cantidadPlantasActual:
        createCultivosVariedadXZonaDto.cantidadPlantasInicial,
    });
    return await this.cvzRepository.save(cvz);
  }

  async findAll(): Promise<CultivosVariedadXZona[]> {
    return await this.cvzRepository.find();
  }

  async findByCultivo(cultivoId: string): Promise<CultivosVariedadXZona[]> {
    return await this.cvzRepository.find({
      where: {
        cultivoXVariedad: {
          fkCultivoId: cultivoId,
        },
      },
      relations: [
        'cultivoXVariedad',
        'cultivoXVariedad.variedad',
        'cultivoXVariedad.variedad.tipoCultivo',
        'zona',
      ],
    });
  }

  async findOne(id: string): Promise<CultivosVariedadXZona> {
    console.log(`[DEBUG] findOne called for id: ${id}`);
    const cvz = await this.cvzRepository.findOne({
      where: { id: id },
      relations: [
        'cultivoXVariedad',
        'cultivoXVariedad.variedad',
        'cultivoXVariedad.variedad.tipoCultivo',
        'zona',
      ],
    });
    console.log(`[DEBUG] findOne result:`, cvz);
    if (cvz) {
      console.log(`[DEBUG] cultivoXVariedad:`, cvz.cultivoXVariedad);
      console.log(`[DEBUG] variedad:`, cvz.cultivoXVariedad?.variedad);
      console.log(
        `[DEBUG] tipoCultivo:`,
        cvz.cultivoXVariedad?.variedad?.tipoCultivo,
      );
      console.log(`[DEBUG] zona:`, cvz.zona);
    }
    if (!cvz) {
      throw new NotFoundException(
        `CultivosVariedadXZona con id ${id} no encontrada`,
      );
    }
    return cvz;
  }

  async getCropDetails(
    cvzId: string,
  ): Promise<{ tipoCultivo: string; variedad: string; zona: string }> {
    console.log(`[DEBUG] getCropDetails called for cvzId: ${cvzId}`);
    const cvz = await this.cvzRepository.findOne({
      where: { id: cvzId },
      relations: [
        'cultivoXVariedad',
        'cultivoXVariedad.variedad',
        'cultivoXVariedad.variedad.tipoCultivo',
        'zona',
      ],
    });

    if (!cvz) {
      throw new NotFoundException(`Cultivo con id ${cvzId} no encontrado`);
    }

    const tipoCultivo =
      cvz.cultivoXVariedad?.variedad?.tipoCultivo?.nombre || 'Tipo desconocido';
    const variedad =
      cvz.cultivoXVariedad?.variedad?.nombre || 'Variedad desconocida';
    const zona = cvz.zona?.nombre || 'Zona desconocida';

    console.log(
      `[DEBUG] getCropDetails result: tipoCultivo=${tipoCultivo}, variedad=${variedad}, zona=${zona}`,
    );

    return {
      tipoCultivo,
      variedad,
      zona,
    };
  }

  async update(
    id: string,
    updateCultivosVariedadXZonaDto: UpdateCultivosVariedadXZonaDto,
  ): Promise<CultivosVariedadXZona> {
    const cvz = await this.findOne(id);
    Object.assign(cvz, updateCultivosVariedadXZonaDto);
    return await this.cvzRepository.save(cvz);
  }

  async remove(id: string): Promise<void> {
    const cvz = await this.findOne(id);
    await this.cvzRepository.remove(cvz);
  }

  // Nuevos métodos para características del cultivo
  async actualizarCantidadPlantas(
    id: string,
    dto: UpdateCantidadPlantasDto,
  ): Promise<CultivosVariedadXZona> {
    const cvz = await this.cvzRepository.findOne({ where: { id } });
    if (!cvz) {
      throw new NotFoundException(`Cultivo con id ${id} no encontrado`);
    }

    // Validar que no quede cantidad negativa
    if (dto.cantidad_plantas < 0) {
      throw new NotFoundException(
        'La cantidad de plantas no puede ser negativa',
      );
    }

    // Actualizar cantidad directamente con el valor proporcionado
    cvz.cantidadPlantasActual = dto.cantidad_plantas;
    cvz.fechaActualizacion = new Date();

    return await this.cvzRepository.save(cvz);
  }

  async actualizarEstadoFenologico(
    id: string,
    estadoId: number,
  ): Promise<CultivosVariedadXZona> {
    const cvz = await this.cvzRepository.findOne({ where: { id } });
    if (!cvz) {
      throw new NotFoundException(`Cultivo con id ${id} no encontrado`);
    }

    cvz.fkEstadoFenologicoId = estadoId;
    cvz.fechaActualizacion = new Date();

    return await this.cvzRepository.save(cvz);
  }

  async calcularEdadCultivo(id: string): Promise<number> {
    const cvz = await this.cvzRepository.findOne({
      where: { id },
      relations: ['cultivoXVariedad', 'cultivoXVariedad.cultivo'],
    });

    if (!cvz?.cultivoXVariedad?.cultivo?.siembra) {
      return 0;
    }

    const fechaSiembra = new Date(cvz.cultivoXVariedad.cultivo.siembra);
    const hoy = new Date();

    return Math.floor(
      (hoy.getTime() - fechaSiembra.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
