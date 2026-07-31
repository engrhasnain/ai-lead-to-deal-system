import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';

// Uses the better-sqlite3 driver adapter instead of Prisma's own native
// query engine — see schema.prisma for why. DATABASE_URL is read here
// explicitly because driver adapters construct their own connection
// rather than Prisma Client resolving datasource.url = env(...) itself.
function createAdapter(): PrismaBetterSQLite3 {
  const url = process.env.DATABASE_URL || 'file:./leads.db';
  // better-sqlite3 (unlike Prisma's own datasource url) takes a plain file
  // path, not a "file:" URL scheme — strip the prefix if present.
  const filePath = url.startsWith('file:') ? url.slice('file:'.length) : url;
  return new PrismaBetterSQLite3({ url: filePath });
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
