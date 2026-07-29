import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';

const AI_THROTTLE = { default: { limit: 20, ttl: 3_600_000 } };

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('pipeline')
  pipeline() {
    return this.analyticsService.pipeline();
  }

  @Get('report')
  @Throttle(AI_THROTTLE)
  report() {
    return this.analyticsService.report();
  }

  @Get('forecast')
  forecast() {
    return this.analyticsService.forecast();
  }
}
