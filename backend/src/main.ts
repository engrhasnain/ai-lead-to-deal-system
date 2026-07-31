import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config(); // populate process.env from .env before any config below is read

import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import { HttpException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Some hosts (e.g. Hostinger's Node app runner) invoke `node dist/main.js`
// directly, bypassing npm's prestart lifecycle hooks — so schema creation
// must not depend on npm running it. Do it here instead, before the Nest
// app (and anything that queries the DB in onModuleInit) boots.
//
// This deliberately avoids `prisma db push` and Prisma's own native query
// engine entirely — on Hostinger the schema-engine binary panics at
// startup, and even after routing around it, the native query engine hangs
// indefinitely on its very first query (confirmed via step-by-step startup
// logging). Both are replaced by the better-sqlite3 driver adapter (see
// prisma.service.ts for the same swap on the app's normal query path) — the
// exact CREATE TABLE statements Prisma itself generates for this schema
// (captured once via a local `db push`) are executed directly through it.
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "leads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "stage" TEXT NOT NULL DEFAULT 'new',
    "score" INTEGER,
    "score_reasoning" TEXT,
    "deal_value" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "next_action" TEXT,
    "ai_summary" TEXT,
    "icp_fit" TEXT,
    "enriched_at" DATETIME,
    "notes" TEXT,
    "lost_reason" TEXT,
    "stage_entered_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "emails" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lead_id" INTEGER NOT NULL,
    "email_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" DATETIME,
    CONSTRAINT "emails_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "lead_activities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lead_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
];

function log(msg: string) {
  // eslint-disable-next-line no-console
  console.log(`[schema-init ${new Date().toISOString()}] ${msg}`);
}

async function ensureDatabaseSchemaInner() {
  const projectRoot = path.join(__dirname, '..'); // dist/ -> project root
  const dbPath = path.join(projectRoot, 'leads.db');

  process.env.DATABASE_URL = `file:${dbPath}`;
  log(`DATABASE_URL set to file:${dbPath}`);

  log('new PrismaClient() with better-sqlite3 adapter: start');
  const prisma = new PrismaClient({ adapter: new PrismaBetterSQLite3({ url: dbPath }) });
  log('new PrismaClient() with better-sqlite3 adapter: done');

  try {
    for (let i = 0; i < SCHEMA_SQL.length; i++) {
      log(`executeRawUnsafe[${i}]: start`);
      await prisma.$executeRawUnsafe(SCHEMA_SQL[i]);
      log(`executeRawUnsafe[${i}]: done`);
    }
    log('Database schema ensured (leads, emails, lead_activities).');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to create database schema:', err);
  } finally {
    log('$disconnect(): start');
    await prisma.$disconnect();
    log('$disconnect(): done');
  }
}

// Belt-and-suspenders: the better-sqlite3 adapter fixed the actual hang, but
// keep a hard timeout so `app.listen()` always gets called within
// Hostinger's own startup window no matter what — the timer is cancelled
// as soon as the real work finishes, so it won't fire (or log) on the
// normal, fast path.
async function ensureDatabaseSchema() {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      log('TIMEOUT after 8s — proceeding to start the server anyway.');
      resolve();
    }, 8000);
  });
  await Promise.race([ensureDatabaseSchemaInner(), timeout]);
  clearTimeout(timer!);
}

async function bootstrap() {
  await ensureDatabaseSchema();

  const publicDemoMode = (process.env.PUBLIC_DEMO_MODE ?? 'true').toLowerCase() === 'true';
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const detail = errors.map((e) => ({
          field: e.property,
          errors: Object.values(e.constraints || {}),
        }));
        return new HttpException({ detail }, 422);
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Interactive API docs are disabled entirely in public demo mode, matching
  // the Python backend's docs_url=None / redoc_url=None / openapi_url=None.
  if (!publicDemoMode) {
    const config = new DocumentBuilder()
      .setTitle('AI Lead-to-Deal API')
      .setVersion('2.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`AI Lead-to-Deal API listening on port ${port} (public demo mode: ${publicDemoMode})`);
}

bootstrap();
