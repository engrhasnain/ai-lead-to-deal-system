import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { buildDemoActivities, buildDemoLeads } from './seed-data';

const RESET_JOB_NAME = 'demo_reset';

@Injectable()
export class DemoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();

    const publicDemoMode = (process.env.PUBLIC_DEMO_MODE ?? 'true').toLowerCase() === 'true';
    if (publicDemoMode) {
      const minutes = parseInt(process.env.DEMO_RESET_INTERVAL_MINUTES || '60', 10);
      const ms = Math.max(1, minutes) * 60 * 1000;
      const interval = setInterval(() => {
        this.reset().catch((err) => this.logger.error(`Demo reset job failed: ${err}`));
      }, ms);
      this.schedulerRegistry.addInterval(RESET_JOB_NAME, interval);
      this.logger.log(`Public demo mode active — resetting demo data every ${minutes} minute(s).`);
    }
  }

  onModuleDestroy() {
    if (this.schedulerRegistry.doesExist('interval', RESET_JOB_NAME)) {
      this.schedulerRegistry.deleteInterval(RESET_JOB_NAME);
    }
  }

  private async createDemoData(): Promise<void> {
    const now = new Date();
    const leads = buildDemoLeads(now);

    const insertedIds: number[] = [];
    for (const lead of leads) {
      const created = await this.prisma.lead.create({ data: lead });
      insertedIds.push(created.id);
    }

    const activities = buildDemoActivities(insertedIds, now);
    await this.prisma.leadActivity.createMany({ data: activities });
  }

  async seedIfEmpty(): Promise<void> {
    const count = await this.prisma.lead.count();
    if (count > 0) return;
    await this.createDemoData();
    this.logger.log('Seeded demo dataset (12 leads).');
  }

  /**
   * Wipes all leads/emails/activities and re-seeds the original 12 demo
   * leads. Runs on a timer in public demo mode so accumulated visitor
   * activity doesn't degrade the shared dataset over time.
   */
  async reset(): Promise<void> {
    await this.prisma.leadActivity.deleteMany();
    await this.prisma.email.deleteMany();
    await this.prisma.lead.deleteMany();
    await this.createDemoData();
    this.logger.log('Demo dataset reset.');
  }
}
