import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoFenologico } from './entities/estado_fenologico.entity';

@Injectable()
export class EstadosFenologicosService {
  constructor(
    @InjectRepository(EstadoFenologico)
    private readonly estadoRepository: Repository<EstadoFenologico>,
  ) {}

  async create(createEstadoDto: {
    nombre: string;
    descripcion?: string;
    orden: number;
  }): Promise<EstadoFenologico> {
    const estado = this.estadoRepository.create(createEstadoDto);
    return await this.estadoRepository.save(estado);
  }

  async findAll(): Promise<EstadoFenologico[]> {
    return await this.estadoRepository.find({
      order: { orden: 'ASC' },
    });
  }

  async findOne(id: number): Promise<EstadoFenologico> {
    const estado = await this.estadoRepository.findOne({ where: { id } });
    if (!estado) {
      throw new NotFoundException(
        `Estado fenológico con id ${id} no encontrado`,
      );
    }
    return estado;
  }

  async update(
    id: number,
    updateEstadoDto: Partial<{
      nombre: string;
      descripcion?: string;
      orden: number;
    }>,
  ): Promise<EstadoFenologico> {
    const estado = await this.findOne(id);
    Object.assign(estado, updateEstadoDto);
    return await this.estadoRepository.save(estado);
  }

  async remove(id: number): Promise<void> {
    const estado = await this.findOne(id);
    await this.estadoRepository.remove(estado);
  }
}
