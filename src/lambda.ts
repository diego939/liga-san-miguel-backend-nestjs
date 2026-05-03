import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';

/**
 * Vercel invoca el handler con `IncomingMessage` / `ServerResponse` de Node.
 * `serverless-http` (proveedor AWS por defecto) espera un evento API Gateway;
 * pasarle `req`/`res` hace que el ciclo de la petición no cierre y la función
 * llegue a FUNCTION_INVOCATION_TIMEOUT (~60s). Aquí se usa Express directamente.
 */
let cachedApp: express.Express | undefined;

async function bootstrapServer(): Promise<express.Express> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  configureApp(app);
  await app.init();
  return expressApp;
}

export const handler = async (
  req: express.Request,
  res: express.Response,
): Promise<void> => {
  if (!cachedApp) {
    cachedApp = await bootstrapServer();
  }
  cachedApp(req, res);
};
