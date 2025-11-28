import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Raw } from 'typeorm';
import { Zona } from './entities/zona.entity';
import { CreateZonaDto } from './dto/create-zona.dto';
import { UpdateZonaDto } from './dto/update-zona.dto';
import { CultivosVariedadXZona } from '../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';

@Injectable()
export class ZonasService {
  constructor(
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    @InjectRepository(CultivosVariedadXZona)
    private readonly cvzRepository: Repository<CultivosVariedadXZona>,
  ) {}

  async create(createZonaDto: CreateZonaDto): Promise<Zona> {
    const zona = this.zonaRepository.create(createZonaDto);
    return await this.zonaRepository.save(zona);
  }

  async findAll(): Promise<Zona[]> {
    return await this.zonaRepository.find({
      relations: [
        'zonaMqttConfigs',
        'cultivosVariedad',
        'cultivosVariedad.cultivoXVariedad',
        'cultivosVariedad.cultivoXVariedad.variedad',
        'cultivosVariedad.cultivoXVariedad.variedad.tipoCultivo',
      ],
    });
  }

  async search(query: string, page: number = 1, limit: number = 10) {
    console.log('Search query:', query, 'page:', page, 'limit:', limit);
    try {
      const skip = (page - 1) * limit;
      const qb = this.cvzRepository
        .createQueryBuilder('cvz')
        .leftJoinAndSelect('cvz.zona', 'zona')
        .leftJoinAndSelect('cvz.cultivoXVariedad', 'cxv')
        .leftJoinAndSelect('cxv.variedad', 'variedad')
        .leftJoinAndSelect('variedad.tipoCultivo', 'tipoCultivo')
        .where(
          'zona.nombre ILIKE :query OR variedad.nombre ILIKE :query OR tipoCultivo.nombre ILIKE :query',
          { query: `%${query}%` },
        )
        .skip(skip)
        .take(limit);

      console.log('Query SQL:', qb.getSql());
      const [items, total] = await qb.getManyAndCount();
      console.log('Items found:', items.length, 'total:', total);

      const mappedItems = items.map((item) => ({
        id: item.id,
        nombre: `${item.cultivoXVariedad?.variedad?.tipoCultivo?.nombre || 'Tipo'} - ${item.cultivoXVariedad?.variedad?.nombre || 'Variedad'} - ${item.zona?.nombre || 'Zona'}`,
        zonaId: item.zona?.id,
        cultivoId: item.cultivoXVariedad?.cultivo?.id,
        variedadNombre: item.cultivoXVariedad?.variedad?.nombre,
        tipoCultivoNombre: item.cultivoXVariedad?.variedad?.tipoCultivo?.nombre,
      }));
      console.log('Mapped items:', mappedItems.length);
      return {
        items: mappedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error in zonas search:', error);
      throw error;
    }
  }

  async findByNombre(nombre: string): Promise<Zona[]> {
    return await this.zonaRepository.find({ where: { nombre } });
  }

  async findOne(id: string): Promise<Zona> {
    const zona = await this.zonaRepository.findOne({
      where: { id },
    });
    if (!zona) {
      throw new NotFoundException(`Zona con id ${id} no encontrada`);
    }
    return zona;
  }

  async update(id: string, updateZonaDto: UpdateZonaDto): Promise<Zona> {
    const zona = await this.findOne(id);
    Object.assign(zona, updateZonaDto);
    return await this.zonaRepository.save(zona);
  }

  async remove(id: string): Promise<void> {
    const zona = await this.findOne(id);
    await this.zonaRepository.remove(zona);
  }

  async getCultivosVariedadXZona(zonaId: string) {
    const zona = await this.zonaRepository.findOne({
      where: { id: zonaId },
      relations: [
        'cultivosVariedad.cultivoXVariedad.cultivo',
        'cultivosVariedad.cultivoXVariedad.variedad',
        'cultivosVariedad.cultivoXVariedad.variedad.tipoCultivo',
      ],
    });

    if (!zona) {
      throw new NotFoundException(`Zona con id ${zonaId} no encontrada`);
    }

    return {
      zona: {
        id: zona.id,
        nombre: zona.nombre,
      },
      cultivos:
        zona.cultivosVariedad?.map((cvz) => ({
          cvzId: cvz.id,
          cultivo: {
            id: cvz.cultivoXVariedad?.cultivo?.id,
            nombre:
              cvz.cultivoXVariedad?.variedad?.tipoCultivo?.nombre ||
              'Tipo Cultivo',
            estado: cvz.cultivoXVariedad?.cultivo?.estado,
            fechaSiembra: cvz.cultivoXVariedad?.cultivo?.siembra,
          },
          variedad: {
            id: cvz.cultivoXVariedad?.variedad?.id,
            nombre: cvz.cultivoXVariedad?.variedad?.nombre,
          },
        })) || [],
    };
  }
}
