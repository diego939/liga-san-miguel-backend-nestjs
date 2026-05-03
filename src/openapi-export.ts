import 'reflect-metadata';
import 'dotenv/config';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyApiGlobals, buildOpenApiDocument } from './app-setup';

/**
 * Genera `public/openapi.json` en el build (Vercel/Railway/CI).
 * OPENAPI_EXPORT=1 debe ir en el script de build (p. ej. cross-env) para
 * no bloquear Prisma/keepalive durante la exportación.
 */
async function main() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  applyApiGlobals(app);
  const document = buildOpenApiDocument(app);
  const publicDir = join(process.cwd(), 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }
  writeFileSync(
    join(publicDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
    'utf-8',
  );
  await app.close();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
