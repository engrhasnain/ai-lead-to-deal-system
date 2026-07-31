import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config(); // populate process.env from .env before any config below is read

import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { HttpException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Some hosts (e.g. Hostinger's Node app runner) invoke `node dist/main.js`
// directly, bypassing npm's prestart lifecycle hooks — so the schema-push
// step must not depend on npm running it. Do it here instead, before the
// Nest app (and anything that queries the DB in onModuleInit) boots.
//
// Two things deliberately avoid relying on `process.cwd()` or a relative
// DATABASE_URL, since Hostinger's runtime working directory and which
// source files survive deployment (it ships dist/ + node_modules/, but not
// the original prisma/ source folder) turned out not to match local dev:
//   1. The schema is read from a copy placed at dist/prisma/schema.prisma
//      (see the "postbuild" script) and located via `__dirname`, which is
//      always the compiled main.js's own folder regardless of cwd.
//   2. DATABASE_URL is overridden to an absolute path before anything
//      touches the database, so both this CLI call and the Nest app's own
//      PrismaClient definitely open the exact same file.
//
// Calls the locally-installed prisma CLI's JS entry point directly with
// `node` (not via `npx prisma`, which can decide to download a different/
// newer major version instead of using the one already in node_modules —
// slow at best, broken at worst; and not via the .bin/prisma(.cmd) wrapper,
// which needs a shell on Windows and complicates cross-platform behavior).
//
// Prisma's native engine binaries (query engine, schema engine) also lose
// their executable bit somewhere in Hostinger's deploy pipeline (build and
// runtime appear to be separate filesystems/containers, and whatever copies
// artifacts between them doesn't preserve permissions) — restore it on
// every binary-looking file before anything tries to spawn one. This has
// to run for the *app's own* query engine too (node_modules/.prisma/client),
// not just the schema-engine used by db push, or the app boots fine here
// but still crashes the moment a real request needs the database.
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

function ensureDatabaseSchema() {
  const projectRoot = path.join(__dirname, '..'); // dist/ -> project root
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  const prismaCli = path.join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js');
  const dbPath = path.join(projectRoot, 'leads.db');

  process.env.DATABASE_URL = `file:${dbPath}`;
  restoreEngineExecutePermissions(projectRoot);

  if (!fs.existsSync(schemaPath)) {
    // eslint-disable-next-line no-console
    console.error(`Prisma schema not found at ${schemaPath} — skipping schema push.`);
    return;
  }
  if (!fs.existsSync(prismaCli)) {
    // eslint-disable-next-line no-console
    console.error(`Prisma CLI not found at ${prismaCli} — skipping schema push.`);
    return;
  }

  try {
    execFileSync(
      process.execPath,
      [prismaCli, 'db', 'push', '--schema', schemaPath, '--accept-data-loss', '--skip-generate'],
      { stdio: 'inherit', cwd: projectRoot, env: process.env },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Prisma db push failed during startup:', err);
  }
}

async function bootstrap() {
  ensureDatabaseSchema();

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
