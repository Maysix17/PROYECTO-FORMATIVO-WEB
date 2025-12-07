import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CategoriaActividad } from './entities/categoria_actividad.entity';
import { CreateCategoriaActividadDto } from './dto/create-categoria_actividad.dto';
import { UpdateCategoriaActividadDto } from './dto/update-categoria_actividad.dto';

@Injectable()
export class CategoriaActividadService {
  constructor(
    @InjectRepository(CategoriaActividad)
    private readonly categoriaRepository: Repository<CategoriaActividad>,
  ) {}

  async create(
    createCategoriaActividadDto: CreateCategoriaActividadDto,
  ): Promise<CategoriaActividad> {
    const categoria = this.categoriaRepository.create(
      createCategoriaActividadDto,
    );
    return await this.categoriaRepository.save(categoria);
  }

  async findAll(): Promise<CategoriaActividad[]> {
    return await this.categoriaRepository.find();
  }

  async search(query: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.categoriaRepository.findAndCount({
      where: {
        nombre: Like(`%${query}%`),
      },
      skip,
      take: limit,
    });
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CategoriaActividad> {
    const categoria = await this.categoriaRepository.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(
        `CategoriaActividad con ID ${id} no encontrada`,
      );
    }
    return categoria;
  }

  async update(
    id: string,
    updateCategoriaActividadDto: UpdateCategoriaActividadDto,
  ): Promise<CategoriaActividad> {
    const categoria = await this.findOne(id);
    Object.assign(categoria, updateCategoriaActividadDto);
    return await this.categoriaRepository.save(categoria);
  }

  async remove(id: string): Promise<void> {
    const categoria = await this.categoriaRepository.findOne({
      where: { id },
      relations: ['actividades']
    });

    if (!categoria) {
      throw new NotFoundException(
        `CategoriaActividad con ID ${id} no encontrada`,
      );
    }

    // Check if there are related actividades
    if (categoria.actividades && categoria.actividades.length > 0) {
      throw new Error(
        `No se puede eliminar la categoría "${categoria.nombre}" porque tiene ${categoria.actividades.length} actividad(es) asociada(s). Elimine o reasigne las actividades primero.`,
      );
    }

    await this.categoriaRepository.remove(categoria);
  }
}
