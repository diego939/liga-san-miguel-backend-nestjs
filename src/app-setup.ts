import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

/** Configuración compartida: CORS, prefijo `api`, pipes (necesaria para generar OpenAPI fiel al runtime). */
export function applyApiGlobals(app: INestApplication): void {
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:4200', 'http://127.0.0.1:4200'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Liga San Miguel API')
    .setDescription(
      'Gestión deportiva: jugadores, pases, torneos, inscripciones, partidos. Reglas RN-01…RN-12 documentadas en respuestas 400.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function configureApp(app: INestApplication): void {
  const isVercel = process.env.VERCEL === '1';

  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter.getType() === 'express') {
    const expressInstance = httpAdapter.getInstance() as {
      set: (key: string, value: unknown) => void;
      get: (path: string, handler: (req: Request, res: Response) => void) => void;
    };
    expressInstance.set('trust proxy', 1);
    if (!isVercel) {
      expressInstance.get('/docs/', (_req: Request, res: Response) =>
        res.redirect(301, '/docs'),
      );
    }
  }

  applyApiGlobals(app);

  // En Vercel la UI Swagger es estática (public/); no generar documento ni rutas /docs en la lambda (ahorra cold start).
  if (!isVercel) {
    const document = buildOpenApiDocument(app);
    SwaggerModule.setup('docs', app, document);
  }
}
