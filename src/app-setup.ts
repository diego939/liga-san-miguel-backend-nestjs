import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureApp(app: INestApplication): void {
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter.getType() === 'express') {
    const expressInstance = httpAdapter.getInstance() as {
      set: (key: string, value: unknown) => void;
    };
    expressInstance.set('trust proxy', 1);
  }

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
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: false });
}
