import { PrismaClient } from '@prisma/client';
import { buildApp } from './app.js';
import { PrismaRepository } from './prisma-repository.js';

const prisma = new PrismaClient();
const repository = new PrismaRepository(prisma);
const app = await buildApp({
  repository,
  adminRepository: repository,
  cookieSecret: process.env.COOKIE_SECRET,
  version: process.env.APP_VERSION ?? 'dev',
  origin: process.env.APP_ORIGIN ?? 'http://localhost:3000',
  logger: true,
  staticDir: process.env.STATIC_DIR,
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
