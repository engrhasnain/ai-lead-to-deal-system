import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicDemoGuard } from '../common/guards/public-demo.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { EmailGenDto } from './dto/email-gen.dto';
import { LeadsService } from './leads.service';

// Strict AI rate limit override — 20/hour per IP, matching the Python
// backend's `AI_RATE_LIMIT`. Everything else on this controller runs at the
// module-wide default (120/hour), matching `READ_RATE_LIMIT`.
const AI_THROTTLE = { default: { limit: 20, ttl: 3_600_000 } };

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  list(@Query('stage') stage?: string) {
    return this.leadsService.list(stage);
  }

  @Post()
  create(@Body() body: CreateLeadDto) {
    return this.leadsService.create(body);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateLeadDto) {
    return this.leadsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(PublicDemoGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.remove(id);
  }

  @Get(':id/activities')
  activities(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.activities(id);
  }

  @Post(':id/enrich')
  @Throttle(AI_THROTTLE)
  enrich(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.enrich(id);
  }

  @Post(':id/score')
  @Throttle(AI_THROTTLE)
  score(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.score(id);
  }

  @Post(':id/next-action')
  @Throttle(AI_THROTTLE)
  nextAction(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.nextAction(id);
  }

  @Post(':id/email')
  @Throttle(AI_THROTTLE)
  generateEmail(@Param('id', ParseIntPipe) id: number, @Body() body: EmailGenDto) {
    return this.leadsService.generateEmail(id, body.email_type || 'cold');
  }

  @Post(':id/email/:emailId/open')
  markEmailOpened(
    @Param('id', ParseIntPipe) id: number,
    @Param('emailId', ParseIntPipe) emailId: number,
  ) {
    return this.leadsService.markEmailOpened(id, emailId);
  }
}
