import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthenticationGuard } from './common/guards/authentication.guard';
import { AuthorizationGuard } from './common/guards/authorization.guard';
import { Permisos } from './permisos/decorators/permisos.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health check endpoint - no authentication required
  @Get('/health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'API Nest AgroTic',
      version: '1.0.0'
    };
  }

  @Permisos({
    recurso: 'productos',
    acciones: ['leer'],
    moduloNombre: 'Inventario',
  })
  @Get('/products')
  getProducts(@Req() req) {
    return {
      message: 'Acceso concedido al recurso: Productos',
      userId: req.userId,
    };
  }

  @Get('/users')
  getUsers(@Req() req) {
    return {
      message: 'Acceso concedido al recurso: Usuarios',
      userId: req.userId,
    };
  }

  // Ejemplo de una ruta que no requiere permisos específicos
  @Get('/public-info')
  getPublicInfo() {
    return {
      message: 'Esta es información pública, no se requieren permisos.',
    };
  }

  @Get('uploads-test')
  getUploadsTest() {
    return 'Uploads endpoint working';
  }

  @Get('test-image')
  getTestImage() {
    return {
      message: 'Test image endpoint',
      imageUrl: '/uploads/imgUrl-1761829728566-kaz7l8kcxe.jpg',
    };
  }
}
