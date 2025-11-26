import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(
    cors({
      origin: configService.get('FRONTEND_URL')?.split(',').map(s => s.trim()) || ['http://localhost:5173'],
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // Lanza un error si se envían propiedades no permitidas
      transform: true, // Transforma automáticamente los payloads a los tipos del DTO
      transformOptions: {
        enableImplicitConversion: true, // Permite la conversión implícita de tipos
      },
    }),
  );

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

  console.log(`Server is running on http://localhost:${port}`);
  console.log(`WebSocket server should be available at ws://localhost:${port}`);
}
bootstrap();
