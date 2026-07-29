import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DemoModule } from './demo/demo.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Generous default (120/hour per IP) — matches the Python backend's
    // READ_RATE_LIMIT. AI-calling routes override this down to 20/hour via
    // the @Throttle() decorator (see leads.controller.ts / analytics.controller.ts).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 3_600_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AiModule,
    LeadsModule,
    DashboardModule,
    AnalyticsModule,
    DemoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
