import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';

let cachedServer: ReturnType<typeof serverless> | undefined;

async function bootstrapServer(): Promise<ReturnType<typeof serverless>> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  configureApp(app);
  await app.init();
  return serverless(expressApp);
}

export const handler = async (
  req: express.Request,
  res: express.Response,
): Promise<void> => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  await cachedServer(req, res);
};
