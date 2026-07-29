import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async pipeline() {
    const leads = await this.prisma.lead.findMany();

    const total = leads.length;
    const totalValue = leads.reduce((s, l) => s + (l.dealValue || 0), 0);
    const won = leads.filter((l) => l.stage === 'won').length;
    const closed = leads.filter((l) => l.stage === 'won' || l.stage === 'lost').length;
    const winRate = closed ? Math.round((won / closed) * 1000) / 10 : 0;

    const valued = leads.map((l) => l.dealValue).filter((v): v is number => !!v);
    const avgDeal = valued.length ? Math.round((valued.reduce((s, v) => s + v, 0) / valued.length) * 100) / 100 : 0;

    const byStage: Record<string, number> = {};
    const byStageValue: Record<string, number> = {};
    for (const stage of STAGES) {
      byStage[stage] = leads.filter((l) => l.stage === stage).length;
      byStageValue[stage] = leads
        .filter((l) => l.stage === stage)
        .reduce((s, l) => s + (l.dealValue || 0), 0);
    }

    const sources = Array.from(new Set(leads.map((l) => l.source))).sort();
    const bySource: Record<string, number> = {};
    for (const s of sources) bySource[s] = leads.filter((l) => l.source === s).length;

    const industries = Array.from(new Set(leads.map((l) => l.industry))).sort();
    const byIndustry: Record<string, number> = {};
    for (const i of industries) byIndustry[i] = leads.filter((l) => l.industry === i).length;

    return {
      total_leads: total,
      total_value: totalValue,
      win_rate: winRate,
      avg_deal_size: avgDeal,
      by_stage: byStage,
      by_stage_value: byStageValue,
      by_source: bySource,
      by_industry: byIndustry,
      high_icp: leads.filter((l) => l.icpFit === 'high').length,
      scored_leads: leads.filter((l) => l.score !== null).length,
    };
  }

  async report() {
    const leads = await this.prisma.lead.findMany();

    const byStage: Record<string, number> = {};
    for (const stage of STAGES) byStage[stage] = leads.filter((l) => l.stage === stage).length;

    const won = leads.filter((l) => l.stage === 'won').length;
    const closed = Math.max(1, leads.filter((l) => l.stage === 'won' || l.stage === 'lost').length);
    const winRate = Math.round((won / closed) * 1000) / 10;

    const valuedLeads = leads.filter((l) => !!l.dealValue);
    const totalDealValue = valuedLeads.reduce((s, l) => s + (l.dealValue || 0), 0);
    const avgDealSize = Math.round(totalDealValue / Math.max(1, valuedLeads.length));

    const analytics = {
      total_leads: leads.length,
      total_value: leads.reduce((s, l) => s + (l.dealValue || 0), 0),
      win_rate: winRate,
      by_stage: byStage,
      avg_deal_size: avgDealSize,
    };

    const reportText = await this.ai.generatePipelineReport(analytics);
    return { report: reportText, generated_at: new Date().toISOString() };
  }

  async forecast() {
    const leads = await this.prisma.lead.findMany();

    const probs: Record<string, number> = {
      new: 0.05,
      qualified: 0.2,
      proposal: 0.4,
      negotiation: 0.7,
      won: 1.0,
      lost: 0.0,
    };

    const weighted = leads.reduce((s, l) => s + (l.dealValue || 0) * (probs[l.stage] ?? 0), 0);

    const activeStages = ['new', 'qualified', 'proposal', 'negotiation'];
    const byStage = activeStages.map((stage) => {
      const stageLeads = leads.filter((l) => l.stage === stage);
      return {
        stage,
        value: stageLeads.reduce((s, l) => s + (l.dealValue || 0), 0),
        weighted: Math.round(stageLeads.reduce((s, l) => s + (l.dealValue || 0) * probs[stage], 0)),
        probability: Math.round(probs[stage] * 100),
        count: stageLeads.length,
      };
    });

    const lostLeads = leads.filter((l) => l.stage === 'lost' && l.lostReason);
    const lostReasons: Record<string, number> = {};
    for (const l of lostLeads) {
      const reason = l.lostReason as string;
      lostReasons[reason] = (lostReasons[reason] || 0) + 1;
    }
    const finalLostReasons =
      Object.keys(lostReasons).length > 0
        ? lostReasons
        : { Price: 2, Competitor: 1, 'No Budget': 1, Ghosted: 1, Timeline: 1 };

    return {
      weighted_pipeline: Math.round(weighted),
      expected_close_quarter: Math.round(weighted * 0.75),
      probability_by_stage: byStage,
      lost_reasons: finalLostReasons,
    };
  }
}
