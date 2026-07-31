import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config(); // populate process.env from .env before any config below is read

import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
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
// This deliberately avoids `prisma db push` (the CLI/schema-engine path) —
// on Hostinger the schema-engine binary panics at runtime (likely a
// build-container vs. runtime-container OpenSSL mismatch) even after fixing
// its execute permission. Instead, the exact CREATE TABLE statements Prisma
// itself generates for this schema (captured once via a local `db push` and
// pasted in below) are executed directly through the query engine, which
// — unlike the schema-engine — now has multi-platform binaries bundled via
// `binaryTargets` in schema.prisma and is confirmed working.
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

// Prisma's native engine binaries also lose their executable bit somewhere
// in Hostinger's deploy pipeline (build and runtime appear to be separate
// filesystems/containers, and whatever copies artifacts between them
// doesn't preserve permissions) — restore it on every binary-looking file
// before the query engine (used below, and by the app's own PrismaService)
// tries to load one.
function restoreEngineExecutePermissions(projectRoot: string) {
  const dirs = [
    path.join(projectRoot, 'node_modules', '@prisma'),
    path.join(projectRoot, 'node_modules', '.prisma'),
  ];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/engine/i.test(entry.name)) {
        try {
          fs.chmodSync(full, 0o755);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Could not chmod ${full}:`, err);
        }
      }
    }
  };
  dirs.forEach(walk);
}

async function ensureDatabaseSchema() {
  const projectRoot = path.join(__dirname, '..'); // dist/ -> project root
  const dbPath = path.join(projectRoot, 'leads.db');

  process.env.DATABASE_URL = `file:${dbPath}`;
  restoreEngineExecutePermissions(projectRoot);

  const prisma = new PrismaClient();
  try {
    for (const statement of SCHEMA_SQL) {
      await prisma.$executeRawUnsafe(statement);
    }
    // eslint-disable-next-line no-console
    console.log('Database schema ensured (leads, emails, lead_activities).');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to create database schema:', err);
  } finally {
    await prisma.$disconnect();
  }
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
