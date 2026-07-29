import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { daysInStage } from '../leads/leads.mapper';

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  return `${days}d ago`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const leads = await this.prisma.lead.findMany();
    const now = new Date();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);

    const pipelineValue = leads
      .filter((l) => l.stage !== 'won' && l.stage !== 'lost')
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);

    const wonThisMonth = leads
      .filter((l) => l.stage === 'won' && l.updatedAt >= monthStart)
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);

    const wonThisQuarter = leads
      .filter((l) => l.stage === 'won' && l.updatedAt >= quarterStart)
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);

    const emailCount = await this.prisma.email.count();
    const aiActions =
      leads.filter((l) => l.enrichedAt).length + leads.filter((l) => l.score !== null).length + emailCount;

    const toItem = (l: (typeof leads)[number]) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      stage: l.stage,
      score: l.score,
      deal_value: l.dealValue,
      days_in_stage: daysInStage(l.stageEnteredAt),
      icp_fit: l.icpFit,
    });

    const closing = leads
      .filter((l) => l.stage === 'proposal' || l.stage === 'negotiation')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 6)
      .map(toItem);

    const top = leads
      .filter((l) => l.score && l.stage !== 'won' && l.stage !== 'lost')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(toItem);

    const recentActivities = await this.prisma.leadActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { lead: true },
    });

    const recent = recentActivities.map((a) => ({
      event_type: a.eventType,
      description: a.description,
      lead_name: a.lead ? a.lead.name : 'Unknown',
      time_ago: timeAgo(a.createdAt),
    }));

    return {
      total_leads: leads.length,
      pipeline_value: pipelineValue,
      won_this_month: wonThisMonth,
      won_this_quarter: wonThisQuarter,
      ai_actions_total: aiActions,
      deals_closing_week: closing,
      top_leads: top,
      recent_activities: recent,
      quota_target: 500000,
      quota_achieved: wonThisQuarter,
    };
  }
}
