// src/usuarios/usuarios.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Raw } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';
import { Roles } from '../roles/entities/role.entity';
import { Ficha } from '../fichas/entities/ficha.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdateMeDto } from './dto/update-me.dto';

// Interfaz para tipar el payload del usuario que viene del token JWT
interface RequestingUser {
  rol: string; // e.g., 'ADMIN', 'INSTRUCTOR'
}

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Roles)
    private readonly rolRepository: Repository<Roles>,
    @InjectRepository(Ficha)
    private readonly fichaRepository: Repository<Ficha>,
  ) {}

  /**
   * Crea un usuario con un rol específico.
   * Este método debería ser llamado solo por un administrador autenticado.
   */
  async createUserByPanel(
    createUserDto: CreateUsuarioDto,
    requestingUser?: RequestingUser,
  ) {
    const {
      nombres,
      apellidos,
      dni,
      correo,
      password,
      telefono,
      rolId,
      fichaId,
    } = createUserDto;

    // 1. Buscamos el rol que se quiere asignar para obtener su nombre.
    const rolAAsignar = await this.rolRepository.findOneBy({ id: rolId });
    if (!rolAAsignar) {
      throw new NotFoundException(
        `El rol con ID "${rolId}" no fue encontrado.`,
      );
    }

    // 2. Si el rol es "APRENDIZ" (case insensitive), validar que se proporcione fichaId
    let fichaAsignar: Ficha | undefined;
    if (rolAAsignar.nombre?.toLowerCase() === 'aprendiz') {
      if (!fichaId || fichaId.trim() === '') {
        throw new BadRequestException(
          'Debe proporcionar una ficha para usuarios con rol APRENDIZ.',
        );
      }
      fichaAsignar =
        (await this.fichaRepository.findOneBy({ id: fichaId })) || undefined;
      if (!fichaAsignar) {
        throw new NotFoundException(
          `La ficha con ID "${fichaId}" no fue encontrada.`,
        );
      }
    }

    // 3. Lógica de autorización simplificada
    // Solo los ADMIN pueden crear otros usuarios ADMIN
    if (
      requestingUser &&
      rolAAsignar.nombre === 'ADMIN' &&
      requestingUser.rol !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Solo los administradores pueden crear usuarios con rol ADMIN.',
      );
    }

    const usuarioExistente = await this.usuarioRepository.findOne({
      where: [{ dni }, { correo }],
    });
    if (usuarioExistente) {
      throw new ConflictException('El DNI o el correo ya están registrados.');
    }

    const passwordToUse = password || dni.toString();
    const passwordHash = await bcrypt.hash(passwordToUse, 10);

    const nuevoUsuario = this.usuarioRepository.create({
      nombres,
      apellidos,
      dni,
      telefono,
      correo,
      passwordHash,
      rol: rolAAsignar, // Usamos el rol que ya buscamos
      ficha: fichaAsignar, // Asignamos la ficha si es Aprendiz
    });

    await this.usuarioRepository.save(nuevoUsuario);

    const { passwordHash: _, ...usuarioCreado } = nuevoUsuario;
    return usuarioCreado;
  }

  async findAll() {
    return await this.usuarioRepository.find({
      select: ['id', 'nombres', 'apellidos', 'dni'],
      relations: ['ficha'],
    });
  }

  async search(query: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const qb = this.usuarioRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.ficha', 'f')
      .where(
        'u.nombres ILIKE :query OR u.apellidos ILIKE :query OR CAST(u.dni AS TEXT) ILIKE :query',
        { query: `%${query}%` },
      )
      .select(['u.id', 'u.nombres', 'u.apellidos', 'u.dni', 'f.numero'])
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} usuario`;
  }

  update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    return `This action updates a #${id} usuario`;
  }

  remove(id: number) {
    return `This action removes a #${id} usuario`;
  }

  async findMe(userId: string): Promise<Omit<Usuario, 'passwordHash'>> {
    const user = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: [
        'rol',
        'rol.permisos',
        'rol.permisos.recurso',
        'rol.permisos.recurso.modulo',
        'ficha',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${userId}" no encontrado.`);
    }

    const { passwordHash, ...result } = user;

    return result;
  }

  async updateMe(
    userId: string,
    updateProfileDto: UpdateMeDto,
  ): Promise<Omit<Usuario, 'passwordHash'>> {
    const user = await this.usuarioRepository.preload({
      id: userId,
      ...updateProfileDto,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${userId}" no encontrado.`);
    }

    const updatedUser = await this.usuarioRepository.save(user);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }

  async findByDni(dni: number) {
    const user = await this.usuarioRepository.findOne({
      where: { dni },
      relations: ['ficha', 'rol'],
    });

    if (!user) {
      return []; // Return empty array when user not found
    }

    return [
      {
        numero_documento: user.dni,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo_electronico: user.correo,
        telefono: user.telefono,
        id_ficha: user.ficha?.numero || 'No tiene ficha',
        rol: user.rol?.nombre,
      },
    ];
  }
}
