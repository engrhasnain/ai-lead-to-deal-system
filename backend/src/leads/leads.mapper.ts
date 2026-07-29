import { Email, Lead, LeadActivity } from '@prisma/client';

export type LeadWithRelations = Lead & { emails: Email[]; activities: LeadActivity[] };

export function mapEmail(email: Email) {
  return {
    id: email.id,
    lead_id: email.leadId,
    email_type: email.emailType,
    subject: email.subject,
    body: email.body,
    generated_at: email.generatedAt,
    opened_at: email.openedAt,
  };
}

export function mapActivity(activity: LeadActivity) {
  return {
    id: activity.id,
    lead_id: activity.leadId,
    event_type: activity.eventType,
    description: activity.description,
    created_at: activity.createdAt,
  };
}

export function daysInStage(stageEnteredAt: Date | null): number {
  if (!stageEnteredAt) return 0;
  const diffMs = Date.now() - new Date(stageEnteredAt).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export function mapLead(lead: LeadWithRelations) {
  const days = daysInStage(lead.stageEnteredAt);
  const isStuck = days > 14 && lead.stage !== 'won' && lead.stage !== 'lost';

  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company,
    title: lead.title,
    industry: lead.industry,
    source: lead.source,
    stage: lead.stage,
    score: lead.score,
    score_reasoning: lead.scoreReasoning,
    deal_value: lead.dealValue,
    currency: lead.currency,
    next_action: lead.nextAction,
    ai_summary: lead.aiSummary,
    icp_fit: lead.icpFit,
    enriched_at: lead.enrichedAt,
    notes: lead.notes,
    lost_reason: lead.lostReason,
    stage_entered_at: lead.stageEnteredAt,
    days_in_stage: days,
    is_stuck: isStuck,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
    emails: (lead.emails || []).map(mapEmail),
    activities: (lead.activities || []).map(mapActivity),
  };
}
