import { CLINIC_TIMEZONE } from './common/clinic-timezone';

// Turnos y mensajes deben mostrarse en hora local del consultorio, no en UTC del servidor.
process.env.TZ = process.env.TZ ?? CLINIC_TIMEZONE;

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { runSeed } from './database/run-seed';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);

  if (configService.get('SEED_ON_START') === 'true') {
    await runSeed(app);
  }

  const port = configService.get<number>('PORT', 3000);

  await app.register(require('@fastify/helmet'));
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const origins = corsOrigin.includes(',')
    ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : corsOrigin;

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DentaFlow API')
    .setDescription('🦷 Sistema de Gestión Odontológica — API REST')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticación y sesiones')
    .addTag('Patients', 'Gestión de pacientes')
    .addTag('Odontogram', 'Odontograma interactivo')
    .addTag('Appointments', 'Agenda y turnos')
    .addTag('Users', 'Gestión de usuarios')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`🦷  DentaFlow API → http://localhost:${port}/api`);
  logger.log(`📚  Swagger docs  → http://localhost:${port}/api/docs`);
}

bootstrap();
