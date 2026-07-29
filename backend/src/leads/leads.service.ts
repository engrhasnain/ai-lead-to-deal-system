import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { mapActivity, mapEmail, mapLead, LeadWithRelations } from './leads.mapper';

const RELATIONS_INCLUDE = {
  emails: { orderBy: { id: 'asc' as const } },
  activities: { orderBy: { createdAt: 'desc' as const } },
};

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  private async getLeadOrThrow(id: number): Promise<LeadWithRelations> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: RELATIONS_INCLUDE,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  private async log(leadId: number, eventType: string, description: string) {
    await this.prisma.leadActivity.create({
      data: { leadId, eventType, description },
    });
  }

  async list(stage?: string) {
    const leads = await this.prisma.lead.findMany({
      where: stage ? { stage } : undefined,
      orderBy: { createdAt: 'desc' },
      include: RELATIONS_INCLUDE,
    });
    return leads.map(mapLead);
  }

  async create(body: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        name: body.name,
        email: body.email,
        company: body.company,
        title: body.title,
        industry: body.industry,
        source: body.source ?? 'manual',
        dealValue: body.deal_value ?? null,
        currency: body.currency ?? 'USD',
        stageEnteredAt: new Date(),
      },
    });
    await this.log(lead.id, 'created', `Lead created from ${lead.source}`);
    const full = await this.getLeadOrThrow(lead.id);
    return mapLead(full);
  }

  async get(id: number) {
    return mapLead(await this.getLeadOrThrow(id));
  }

  async update(id: number, body: UpdateLeadDto) {
    const existing = await this.getLeadOrThrow(id);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.company !== undefined) data.company = body.company;
    if (body.title !== undefined) data.title = body.title;
    if (body.industry !== undefined) data.industry = body.industry;
    if (body.source !== undefined) data.source = body.source;
    if (body.deal_value !== undefined) data.dealValue = body.deal_value;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.next_action !== undefined) data.nextAction = body.next_action;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.lost_reason !== undefined) data.lostReason = body.lost_reason;
    if (body.stage_entered_at !== undefined) data.stageEnteredAt = new Date(body.stage_entered_at);

    if (body.stage !== undefined && body.stage !== existing.stage) {
      const oldStage = existing.stage;
      const newStage = body.stage;
      data.stage = newStage;
      data.stageEnteredAt = new Date();
      await this.log(id, 'stage_change', `Moved from ${titleCase(oldStage)} → ${titleCase(newStage)}`);
    }

    if (body.notes !== undefined && body.notes !== existing.notes) {
      await this.log(id, 'note_added', 'Notes updated');
    }

    data.updatedAt = new Date();

    await this.prisma.lead.update({ where: { id }, data });
    const full = await this.getLeadOrThrow(id);
    return mapLead(full);
  }

  async remove(id: number) {
    await this.getLeadOrThrow(id);
    await this.prisma.lead.delete({ where: { id } });
    return { ok: true };
  }

  async activities(id: number) {
    const rows = await this.prisma.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapActivity);
  }

  // ── AI actions ─────────────────────────────────────────────

  async enrich(id: number) {
    const lead = await this.getLeadOrThrow(id);
    const result = await this.ai.enrichLead(lead.name, lead.company, lead.title, lead.industry);
    await this.prisma.lead.update({
      where: { id },
      data: {
        aiSummary: result.ai_summary,
        icpFit: result.icp_fit,
        enrichedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await this.log(id, 'enriched', `AI enriched: ICP ${titleCase(result.icp_fit || 'unknown')}`);
    return mapLead(await this.getLeadOrThrow(id));
  }

  async score(id: number) {
    const lead = await this.getLeadOrThrow(id);
    const result = await this.ai.scoreLead(
      lead.name,
      lead.company,
      lead.title,
      lead.industry,
      lead.dealValue,
      lead.stage,
      lead.aiSummary,
    );
    await this.prisma.lead.update({
      where: { id },
      data: {
        score: result.score,
        scoreReasoning: result.score_reasoning,
        updatedAt: new Date(),
      },
    });
    const reasoningSnippet = (result.score_reasoning || '').slice(0, 80);
    await this.log(id, 'scored', `AI scored ${result.score}/100 — ${reasoningSnippet}`);
    return mapLead(await this.getLeadOrThrow(id));
  }

  async nextAction(id: number) {
    const lead = await this.getLeadOrThrow(id);
    const action = await this.ai.generateNextAction(lead.name, lead.company, lead.stage, lead.score, lead.industry);
    await this.prisma.lead.update({
      where: { id },
      data: { nextAction: action, updatedAt: new Date() },
    });
    await this.log(id, 'next_action', `AI suggested: ${action}`);
    return mapLead(await this.getLeadOrThrow(id));
  }

  async generateEmail(id: number, emailType: string) {
    const lead = await this.getLeadOrThrow(id);
    const result = await this.ai.generateEmail(
      lead.name,
      lead.company,
      lead.title,
      lead.industry,
      lead.aiSummary,
      emailType,
    );
    const email = await this.prisma.email.create({
      data: {
        leadId: id,
        emailType,
        subject: result.subject,
        body: result.body,
      },
    });
    const typeLabel = emailType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    await this.log(id, 'email_sent', `${typeLabel} email generated`);
    return mapEmail(email);
  }

  async markEmailOpened(leadId: number, emailId: number) {
    const email = await this.prisma.email.findUnique({ where: { id: emailId } });
    if (!email || email.leadId !== leadId) {
      throw new NotFoundException('Email not found');
    }
    if (!email.openedAt) {
      const updated = await this.prisma.email.update({
        where: { id: emailId },
        data: { openedAt: new Date() },
      });
      await this.log(leadId, 'email_opened', 'Email marked as opened');
      return mapEmail(updated);
    }
    return mapEmail(email);
  }
}
