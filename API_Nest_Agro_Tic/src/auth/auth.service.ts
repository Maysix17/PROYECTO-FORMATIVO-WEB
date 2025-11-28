import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  Logger,
  BadRequestException, // ✅ Importa BadRequestException para el manejo de errores
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';

import { Usuario } from '../usuarios/entities/usuario.entity';
import { Roles } from '../roles/entities/role.entity';
import { Session } from './sessions/entities/session.entity';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RolesService } from 'src/roles/roles.service';
import { MailerService } from '@nestjs-modules/mailer';

import { CreatePermisoDto } from 'src/permisos/dto/create-permiso.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Roles)
    private readonly rolRepository: Repository<Roles>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Registra un nuevo usuario público con el rol por defecto 'INVITADO'.
   * No devuelve un token.
   */
  async register(registerDto: RegisterAuthDto) {
    const { dni, correo, password, nombres, apellidos, telefono } = registerDto;

    const usuarioExistente = await this.usuarioRepository.findOne({
      where: [{ dni }, { correo }],
    });

    if (usuarioExistente) {
      throw new ConflictException('El DNI o el correo ya están registrados.');
    }

    let rolInvitado = await this.rolRepository.findOne({
      where: { nombre: 'INVITADO' },
    });

    if (!rolInvitado) {
      // Create the default role if it doesn't exist
      rolInvitado = this.rolRepository.create({
        nombre: 'INVITADO',
      });
      await this.rolRepository.save(rolInvitado);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = this.usuarioRepository.create({
      dni,
      nombres,
      apellidos,
      correo,
      passwordHash,
      telefono,
      rol: rolInvitado,
    });

    console.log(nuevoUsuario);

    await this.usuarioRepository.save(nuevoUsuario);

    const { passwordHash: _, ...usuarioSinPassword } = nuevoUsuario;

    return {
      message: 'Usuario registrado exitosamente. Por favor, inicie sesión.',
      usuario: usuarioSinPassword,
    };
  }

  async login(loginDto: LoginAuthDto) {
    const { dni, password } = loginDto;
    const usuario = await this.usuarioRepository.findOne({
      where: { dni },
      // ✅ CAMBIO: Cargar todas las relaciones necesarias para los permisos.
      relations: [
        'rol',
        'rol.permisos',
        'rol.permisos.recurso',
        'rol.permisos.recurso.modulo',
      ],
    });

    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // ✅ CAMBIO: Mapear los permisos al formato deseado.
    const permisos =
      usuario.rol?.permisos
        ?.map((permiso) => {
          // Asegurarse de que el permiso tiene toda la información necesaria.
          if (!permiso.recurso || !permiso.recurso.modulo) {
            return null;
          }
          return {
            modulo: permiso.recurso.modulo.nombre,
            recurso: permiso.recurso.nombre,
            accion: permiso.accion,
          };
        })
        .filter((p) => p !== null) ?? []; // Filtrar nulos y manejar si no hay permisos.

    const payload = {
      sub: usuario.id,
      email: usuario.correo,
      rol: usuario.rol?.nombre,
      // permisos removed to reduce token size for cookies
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      }),

      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION_TIME',
        ),
      }),
    ]);

    console.log(this.configService.get<string>('JWT_EXPIRATION_TIME'));

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 30 * 24 * 60 * 60); // 30 days

    const session = this.sessionRepository.create({
      tokenHash: refreshTokenHash,
      expiresAt,
      isActive: true,
      usuario,
    });
    await this.sessionRepository.save(session);

    // Store session in Redis cache (with error handling)
    try {
      const ttl = 30 * 24 * 60 * 60;
      await this.cacheManager.set(
        `session:${usuario.id}`,
        refreshTokenHash,
        ttl,
      );
    } catch (redisError) {
      this.logger.warn(
        `Failed to store session in Redis for user ${usuario.id}:`,
        redisError.message,
      );
      // Continue with login even if Redis fails - database session is still valid
    }

    return {
      message: 'Inicio de sesión exitoso',
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /*  ejemplo payload(JWT) decencriptado :{ 
  "sub": "068e8229-c36b-4c5b-9379-5615e66b2ad3",
  "email": "pitalitodavid@gmail.com",
  "rol": "ADMIN",
  "permisos": [
    {
      "modulo": "Usuarios",
      "recurso": "acceso_usuarios",
      "accion": "ver"
    },
    {
      "modulo": "IOT",
      "recurso": "acceso_IOT",
      "accion": "ver"
    },
    {
      "modulo": "Cultivos",
      "recurso": "acceso_cultivos",
      "accion": "ver"
    },
    {
      "modulo": "Fitosanitario",
      "recurso": "acceso_fitosanitario",
      "accion": "ver"
    },
    {
      "modulo": "Inventario",
      "recurso": "acceso_inventario",
      "accion": "ver"
    },
    {
      "modulo": "Inicio",
      "recurso": "acceso_inicio",
      "accion": "ver"
    }
  ],
  "iat": 1757520466,
  "exp": 1760112466
}
*/

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const userId = payload.sub;

      // Check session in database first
      const session = await this.sessionRepository.findOne({
        where: {
          usuario: { id: userId },
          isActive: true,
        },
        relations: ['usuario'],
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Sesión no encontrada o expirada.');
      }

      const tokensMatch = await bcrypt.compare(refreshToken, session.tokenHash);

      if (!tokensMatch) {
        // If token doesn't match, invalidate the session
        session.isActive = false;
        await this.sessionRepository.save(session);
        throw new UnauthorizedException('El token de refresco es inválido.');
      }

      // Also check Redis cache as fallback
      const storedTokenHash = await this.cacheManager.get<string>(
        `session:${userId}`,
      );

      if (
        !storedTokenHash ||
        !(await bcrypt.compare(refreshToken, storedTokenHash))
      ) {
        // Invalidate database session if Redis doesn't match
        session.isActive = false;
        await this.sessionRepository.save(session);
        throw new UnauthorizedException('El token de refresco es inválido.');
      }

      if (!tokensMatch) {
        throw new UnauthorizedException('El token de refresco es inválido.');
      }

      const usuario = await this.usuarioRepository.findOne({
        where: { id: userId },
        relations: ['rol'],
      });

      if (!usuario) {
        throw new UnauthorizedException(
          'El usuario asociado a este token ya no existe.',
        );
      }

      const newPayload = {
        sub: usuario.id,
        email: usuario.correo,
        rol: usuario.rol?.nombre,
      };

      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
        }),
        this.jwtService.signAsync(newPayload, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
        }),
      ]);

      // Generate new refresh token hash and update session
      const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
      session.tokenHash = newRefreshTokenHash;
      session.expiresAt = new Date();
      session.expiresAt.setSeconds(session.expiresAt.getSeconds() + 30 * 24 * 60 * 60); // Reset to 30 days from now
      await this.sessionRepository.save(session);

      // Update Redis cache with new token hash
      try {
        const ttl = 30 * 24 * 60 * 60;
        await this.cacheManager.set(`session:${usuario.id}`, newRefreshTokenHash, ttl);
      } catch (redisError) {
        this.logger.warn(`Failed to update session in Redis for user ${usuario.id}:`, redisError.message);
      }

      return {
        message: 'Token actualizado',
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException(
        'El token de refresco es inválido o ha expirado.',
      );
    }
  }

  async logout(userId: string) {
    console.log(`AuthService: Starting logout for userId: ${userId}`);
    try {
      console.log(
        `AuthService: Invalidating database sessions for user ${userId}`,
      );
      // Invalidate all active sessions in database
      const updateResult = await this.sessionRepository.update(
        { usuario: { id: userId }, isActive: true },
        { isActive: false },
      );
      console.log(`AuthService: Database update result:`, updateResult);

      // Try to invalidate session in Redis cache (with error handling)
      try {
        console.log(`AuthService: Deleting Redis session for user ${userId}`);
        await this.cacheManager.del(`session:${userId}`);
        console.log(`AuthService: Redis session deleted successfully`);
      } catch (redisError) {
        this.logger.warn(
          `Failed to delete Redis session for user ${userId}:`,
          redisError.message,
        );
        // Continue with logout even if Redis fails
      }

      console.log(
        `AuthService: Logout completed successfully for user ${userId}`,
      );
      return { message: 'Sesión cerrada exitosamente' };
    } catch (error) {
      console.error(`AuthService: Logout failed for user ${userId}:`, error);
      // Even if database update fails, try to clear Redis
      try {
        await this.cacheManager.del(`session:${userId}`);
      } catch (redisError) {
        this.logger.warn(
          `Failed to delete Redis session for user ${userId} during error recovery:`,
          redisError.message,
        );
      }
      throw error;
    }
  }

  async getUserPermissions(userId: string): Promise<CreatePermisoDto[]> {
    const user = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: [
        'rol',
        'rol.permisos',
        'rol.permisos.recurso',
        'rol.permisos.recurso.modulo',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${userId}" no encontrado.`);
    }

    if (!user.rol || !user.rol.permisos) {
      return [];
    }

    const permisosAgrupados = user.rol.permisos.reduce(
      (acc, permiso) => {
        if (!permiso.recurso || !permiso.recurso.modulo) {
          return acc;
        }

        const nombreRecurso = permiso.recurso.nombre;
        const nombreModulo = permiso.recurso.modulo.nombre;

        if (!acc[nombreRecurso]) {
          acc[nombreRecurso] = {
            moduloNombre: nombreModulo,
            recurso: nombreRecurso,
            acciones: [],
          };
        }

        acc[nombreRecurso].acciones.push(permiso.accion);

        return acc;
      },
      {} as Record<string, CreatePermisoDto>,
    );

    return Object.values(permisosAgrupados);
  }

  // --- ✅ INICIO DE LAS NUEVAS FUNCIONALIDADES ---

  /**
   * Genera y envía un enlace para restablecer la contraseña.
   */
  async forgotPassword(
    email: ForgotPasswordDto['email'],
  ): Promise<{ message: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: email },
    });

    // Por seguridad, no revelamos si el usuario existe.
    if (!usuario) {
      this.logger.warn(
        `Solicitud de reseteo para email no registrado: ${email}`,
      );
      return {
        message:
          'Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
      };
    }

    const payload = { sub: usuario.id, email: usuario.correo };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_RESET_SECRET'), // ❗ Usa una clave secreta diferente
      expiresIn: '15m', // El token debe ser de corta duración
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: usuario.correo,
        subject: 'Restablecimiento de Contraseña',
        html: `
          <h1>Solicitud de Restablecimiento de Contraseña</h1>
          <p>Hola ${usuario.nombres},</p>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
          <a href="${resetLink}" target="_blank">Restablecer mi contraseña</a>
          <p>Este enlace expirará en 15 minutos.</p>
          <p>Si no solicitaste esto, por favor ignora este correo.</p>
        `,
      });
      this.logger.log(`Email de reseteo enviado a: ${usuario.correo}`);
    } catch (error) {
      this.logger.error(
        `Fallo al enviar el email de reseteo a ${usuario.correo}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación.',
      );
    }

    return {
      message:
        'Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
    };
  }

  /**
   * Valida el token y actualiza la contraseña del usuario.
   */

  async resetPassword(
    token: string,
    // ✅ CAMBIO: Recibe el DTO completo para poder comparar las contraseñas.
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    // ✅ CAMBIO: Se extraen y se comparan las contraseñas.
    const { newPassword, repetPassword } = resetPasswordDto;
    if (newPassword !== repetPassword) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_RESET_SECRET'),
      });

      // ✅ CAMBIO: Se usa this.usuarioRepository.findOne en lugar de un findById.
      const usuario = await this.usuarioRepository.findOne({
        where: { id: payload.sub },
      });

      if (!usuario) {
        throw new NotFoundException(
          'El usuario asociado a este token ya no existe.',
        );
      }

      // ✅ CAMBIO: Se usa el método .save() del repositorio para actualizar.
      // 1. Hashear la nueva contraseña.
      usuario.passwordHash = await bcrypt.hash(newPassword, 10);
      // 2. Guardar la entidad 'usuario' actualizada.
      await this.usuarioRepository.save(usuario);

      this.logger.log(
        `Contraseña actualizada para el usuario: ${usuario.correo}`,
      );
      return { message: 'Tu contraseña ha sido actualizada exitosamente.' };
    } catch (error) {
      this.logger.error('Token de reseteo inválido o expirado', error.stack);
      // Si el error es una excepción que ya lanzamos (ej. NotFound), la relanzamos.
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // Para otros errores (ej. JWT expirado), lanzamos un BadRequest genérico.
      throw new BadRequestException(
        'El enlace de restablecimiento no es válido o ha expirado. Por favor, solicita uno nuevo.',
      );
    }
  }
  // --- ✅ FIN DE LAS NUEVAS FUNCIONALIDADES ---
}
