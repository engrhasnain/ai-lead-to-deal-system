import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// Uses the libSQL driver adapter instead of Prisma's own native query
// engine — see schema.prisma for why. better-sqlite3 was tried first, but
// Hostinger's build container can't compile any native addon from source
// (its bundled node-gyp/gyp requires Python 3.8+, and the container only
// has Python 3.6.8) and no prebuilt binary matched. libSQL's native binding
// ships as per-platform npm packages resolved directly by npm install
// (e.g. @libsql/linux-x64-gnu) — no node-gyp involved at all. DATABASE_URL
// is read here explicitly because driver adapters construct their own
// connection rather than Prisma Client resolving datasource.url = env(...)
// itself.
function createAdapter(): PrismaLibSQL {
  const url = process.env.DATABASE_URL || 'file:./leads.db';
  return new PrismaLibSQL({ url });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
