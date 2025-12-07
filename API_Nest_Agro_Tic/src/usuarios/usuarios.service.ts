// src/usuarios/usuarios.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, Raw } from 'typeorm';
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
    // Usuarios con acceso al panel pueden crear cualquier rol

    const usuarioExistente = await this.usuarioRepository.findOne({
      where: [{ dni }, { correo }],
    });
    if (usuarioExistente) {
      throw new ConflictException('El N. Documento o el correo ya están registrados.');
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
      .leftJoinAndSelect('u.rol', 'r')
      .where(
        'u.usu_nombres ILIKE :query OR u.usu_apellidos ILIKE :query OR CAST(u.usu_dni AS TEXT) ILIKE :query',
        { query: `%${query}%` },
      )
      .select(['u.id', 'u.usu_nombres as nombres', 'u.usu_apellidos as apellidos', 'u.usu_dni as dni', 'u.usu_telefono as telefono', 'u.usu_correo as correo', 'f.id', 'f.numero', 'r.id', 'r.nombre'])
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

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto, requestingUser?: RequestingUser) {
    const {
      nombres,
      apellidos,
      dni,
      correo,
      telefono,
      rolId,
      fichaId,
    } = updateUsuarioDto;

    // Find the user to update
    const user = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['rol', 'ficha'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    // Check for conflicts with DNI and email (excluding current user)
    if (dni !== undefined) {
      const existingUserWithDni = await this.usuarioRepository.findOne({
        where: { dni },
      });
      if (existingUserWithDni && existingUserWithDni.id !== id) {
        throw new ConflictException('El N. Documento ya está registrado por otro usuario.');
      }
    }

    if (correo !== undefined) {
      const existingUserWithEmail = await this.usuarioRepository.findOne({
        where: { correo },
      });
      if (existingUserWithEmail && existingUserWithEmail.id !== id) {
        throw new ConflictException('El correo ya está registrado por otro usuario.');
      }
    }

    // Handle role changes
    let newRol: Roles | null = null;
    if (rolId !== undefined) {
      newRol = await this.rolRepository.findOneBy({ id: rolId });
      if (!newRol) {
        throw new NotFoundException(`El rol con ID "${rolId}" no fue encontrado.`);
      }
    }

    // Handle ficha changes
    let newFicha: Ficha | null = null;
    if (fichaId !== undefined) {
      if (fichaId.trim() === '') {
        newFicha = null; // Remove ficha
      } else {
        newFicha = await this.fichaRepository.findOneBy({ id: fichaId });
        if (!newFicha) {
          throw new NotFoundException(`La ficha con ID "${fichaId}" no fue encontrada.`);
        }
      }
    }

    // Validate ficha requirement for APRENDIZ role
    const finalRol = newRol || user.rol;
    const finalFicha = fichaId !== undefined ? newFicha : user.ficha;

    if (finalRol && finalRol.nombre?.toLowerCase() === 'aprendiz' && !finalFicha) {
      throw new BadRequestException(
        'Debe proporcionar una ficha para usuarios con rol APRENDIZ.',
      );
    }

    // Update user fields
    if (nombres !== undefined) user.nombres = nombres;
    if (apellidos !== undefined) user.apellidos = apellidos;
    if (dni !== undefined) user.dni = dni;
    if (correo !== undefined) user.correo = correo;
    if (telefono !== undefined) user.telefono = telefono;
    if (rolId !== undefined) user.rol = newRol || undefined;
    if (fichaId !== undefined) user.ficha = newFicha || undefined;

    // Save updated user
    const updatedUser = await this.usuarioRepository.save(user);

    // Return user without password hash
    const { passwordHash, ...result } = updatedUser;
    return result;
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
    // Check for conflicts with DNI and email if they are being updated
    if (updateProfileDto.dni !== undefined) {
      const existingUserWithDni = await this.usuarioRepository.findOne({
        where: { dni: updateProfileDto.dni },
      });
      if (existingUserWithDni && existingUserWithDni.id !== userId) {
        throw new ConflictException('El N. Documento ya está registrado por otro usuario.');
      }
    }

    if (updateProfileDto.correo !== undefined) {
      const existingUserWithEmail = await this.usuarioRepository.findOne({
        where: { correo: updateProfileDto.correo },
      });
      if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
        throw new ConflictException('El correo ya está registrado por otro usuario.');
      }
    }

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
        id: user.id,
        dni: user.dni,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo_electronico: user.correo,
        telefono: user.telefono,
        id_ficha: user.ficha?.numero || 'No tiene ficha',
        rol: user.rol?.nombre,
        rolId: user.rol?.id,
        fichaId: user.ficha?.id,
      },
    ];
  }
}
