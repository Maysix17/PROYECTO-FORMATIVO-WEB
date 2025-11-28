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
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://uncleanly-fairish-lamonica.ngrok-free.dev',
        ];

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      },
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
