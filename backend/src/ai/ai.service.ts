import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

// Same model id used by the archived Python backend (ai.py) — kept identical
// for behavioral parity rather than swapped for a "recommended default".
const MODEL = 'claude-sonnet-4-6';

export interface EnrichmentResult {
  ai_summary: string;
  icp_fit: 'high' | 'medium' | 'low';
}

export interface ScoreResult {
  score: number;
  score_reasoning: string;
  recommended_stage?: string;
}

export interface EmailResult {
  subject: string;
  body: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;
  private demoMode: boolean;

  constructor() {
    this.demoMode = (process.env.DEMO_MODE ?? 'true').toLowerCase() === 'true';
    try {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || undefined });
    } catch (err) {
      this.logger.warn(`Anthropic client could not be initialized, forcing demo mode: ${err}`);
      this.client = null;
      this.demoMode = true;
    }
  }

  // ── Live Claude calls ─────────────────────────────────────

  async enrichLead(
    name: string,
    company: string,
    title: string,
    industry: string,
  ): Promise<EnrichmentResult> {
    if (this.demoMode || !this.client) {
      return this.demoEnrichment(name, company, title, industry);
    }

    const prompt = `You are a B2B sales intelligence AI. Enrich this lead and return JSON only.

Lead: ${name} | ${title} at ${company} | Industry: ${industry}

Return JSON with exactly these fields:
{
  "ai_summary": "2-3 sentence company and contact summary focused on sales relevance",
  "icp_fit": "high" | "medium" | "low"
}`;

    try {
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      });
      return this.parseJsonResponse(msg) as EnrichmentResult;
    } catch (err) {
      this.logger.warn(`enrichLead live call failed, falling back to demo output: ${err}`);
      return this.demoEnrichment(name, company, title, industry);
    }
  }

  async scoreLead(
    name: string,
    company: string,
    title: string,
    industry: string,
    dealValue: number | null,
    stage: string,
    aiSummary: string | null,
  ): Promise<ScoreResult> {
    if (this.demoMode || !this.client) {
      return this.demoScore(title, industry, dealValue);
    }

    const prompt = `You are a B2B sales scoring AI. Score this lead 0-100 and return JSON only.

Lead: ${name} | ${title} at ${company} | Industry: ${industry}
Deal Value: $${dealValue ?? 'Unknown'} | Stage: ${stage}
Context: ${aiSummary || 'Not enriched'}

Score criteria: title seniority (40%), industry fit (30%), deal size (20%), stage progression (10%).

Return JSON:
{
  "score": <integer 0-100>,
  "score_reasoning": "2-sentence explanation",
  "recommended_stage": "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
}`;

    try {
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });
      return this.parseJsonResponse(msg) as ScoreResult;
    } catch (err) {
      this.logger.warn(`scoreLead live call failed, falling back to demo output: ${err}`);
      return this.demoScore(title, industry, dealValue);
    }
  }

  async generateNextAction(
    name: string,
    company: string,
    stage: string,
    score: number | null,
    industry: string,
  ): Promise<string> {
    if (this.demoMode || !this.client) {
      return this.demoNextAction(stage, score);
    }

    const prompt = `You are a sales coach AI. Suggest ONE specific next action for this lead.
Return only the action text, no explanation, max 12 words.

${name} at ${company} (${industry}) | Stage: ${stage} | Score: ${score ?? 'unscored'}`;

    try {
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 60,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = this.firstText(msg).trim();
      return text.replace(/^"|"$/g, '');
    } catch (err) {
      this.logger.warn(`generateNextAction live call failed, falling back to demo output: ${err}`);
      return this.demoNextAction(stage, score);
    }
  }

  async generateEmail(
    name: string,
    company: string,
    title: string,
    industry: string,
    aiSummary: string | null,
    emailType: string,
  ): Promise<EmailResult> {
    if (this.demoMode || !this.client) {
      return this.demoEmail(name, company, title, emailType);
    }

    const labels: Record<string, string> = {
      cold: 'initial cold outreach email',
      follow_up_1: 'first follow-up (3 days after cold email)',
      follow_up_2: 'second follow-up (7 days, final touch)',
      proposal: 'formal proposal presentation email',
    };

    const prompt = `Write a professional B2B sales email: ${labels[emailType] || 'cold outreach'}.
Prospect: ${name}, ${title} at ${company} (${industry})
Context: ${aiSummary || 'No enrichment data yet'}

Return JSON:
{
  "subject": "concise subject line",
  "body": "full email body with \\n line breaks, 150-200 words, professional but human tone"
}`;

    try {
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      });
      return this.parseJsonResponse(msg) as EmailResult;
    } catch (err) {
      this.logger.warn(`generateEmail live call failed, falling back to demo output: ${err}`);
      return this.demoEmail(name, company, title, emailType);
    }
  }

  async generatePipelineReport(analytics: Record<string, unknown>): Promise<string> {
    if (this.demoMode || !this.client) {
      return this.demoReport(analytics);
    }

    const prompt = `You are a sales intelligence AI. Write a concise pipeline health report.

Data: ${JSON.stringify(analytics, null, 2)}

Write a structured report with: ## Executive Summary, ## Pipeline Health, ## Top Opportunities, ## Recommended Actions.
Use markdown bullet points. Be specific with numbers. Max 400 words.`;

    try {
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });
      return this.firstText(msg).trim();
    } catch (err) {
      this.logger.warn(`generatePipelineReport live call failed, falling back to demo output: ${err}`);
      return this.demoReport(analytics);
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  private firstText(msg: Anthropic.Message): string {
    const block = msg.content[0];
    if (block && block.type === 'text') return block.text;
    return '';
  }

  private parseJsonResponse(msg: Anthropic.Message): unknown {
    let raw = this.firstText(msg).trim();
    if (raw.startsWith('```')) {
      const parts = raw.split('```');
      raw = (parts[1] || '').replace(/^json/, '').trim();
    }
    return JSON.parse(raw);
  }

  // ── Demo data generators ──────────────────────────────────

  private demoEnrichment(
    name: string,
    company: string,
    title: string,
    industry: string,
  ): EnrichmentResult {
    const seniorWords = ['ceo', 'cto', 'coo', 'vp', 'director', 'head', 'chief', 'founder', 'president'];
    const senior = seniorWords.some((w) => title.toLowerCase().includes(w));
    const fitIndustries = ['saas', 'technology', 'fintech', 'healthcare', 'e-commerce', 'logistics'];
    const fitInd = fitIndustries.includes(industry.toLowerCase());
    const icp: 'high' | 'medium' | 'low' = senior && fitInd ? 'high' : senior || fitInd ? 'medium' : 'low';

    const summaries: Record<'high' | 'medium' | 'low', string> = {
      high:
        `${company} is a high-growth organization in the ${industry} space with strong technology adoption signals. ` +
        `${name} holds a senior decision-making role with direct influence over vendor procurement and technology investments. ` +
        `Exceptional ICP match — priority outreach recommended.`,
      medium:
        `${company} operates in the ${industry} sector with moderate growth indicators. ` +
        `${name}'s role suggests meaningful influence over purchasing decisions, though executive alignment may be needed for final sign-off. ` +
        `Worth qualifying further with a discovery call.`,
      low:
        `${company} is an emerging player in ${industry} with limited signals of near-term technology investment. ` +
        `${name}'s position may not carry direct procurement authority. ` +
        `Longer sales cycle expected — consider nurture sequence before active outreach.`,
    };

    return { ai_summary: summaries[icp], icp_fit: icp };
  }

  private demoScore(title: string, industry: string, dealValue: number | null): ScoreResult {
    let base = 35;
    const t = title.toLowerCase();
    if (['ceo', 'cto', 'coo', 'founder', 'president'].some((w) => t.includes(w))) {
      base += 35;
    } else if (['vp', 'vice president', 'director', 'head'].some((w) => t.includes(w))) {
      base += 25;
    } else if (['manager', 'lead', 'senior'].some((w) => t.includes(w))) {
      base += 12;
    }

    const ind = industry.toLowerCase();
    if (['saas', 'fintech', 'technology'].includes(ind)) {
      base += 15;
    } else if (['healthcare', 'e-commerce', 'logistics'].includes(ind)) {
      base += 8;
    }

    if (dealValue) {
      if (dealValue >= 50000) base += 10;
      else if (dealValue >= 15000) base += 5;
    }

    const jitter = Math.floor(Math.random() * 11) - 4; // random.randint(-4, 6)
    const score = Math.min(97, Math.max(18, base + jitter));

    let reasoning: string;
    let rec: string;
    if (score >= 75) {
      reasoning =
        'Senior decision-maker with direct budget authority scores high on our ICP index. Industry alignment and deal size both signal strong fit and genuine intent.';
      rec = 'proposal';
    } else if (score >= 50) {
      reasoning =
        'Moderate seniority and reasonable industry fit. Needs further qualification to confirm budget and decision timeline before advancing.';
      rec = 'qualified';
    } else {
      reasoning =
        'Limited title authority and below-core-ICP industry. Longer sales cycle expected with additional stakeholder touchpoints required.';
      rec = 'new';
    }

    return { score, score_reasoning: reasoning, recommended_stage: rec };
  }

  private demoNextAction(stage: string, _score: number | null): string {
    const actions: Record<string, string[]> = {
      new: [
        'Send personalized cold outreach email today',
        'Research company pain points before first contact',
        'Connect on LinkedIn with value-add insight',
      ],
      qualified: [
        'Schedule 30-min discovery call this week',
        'Send ROI case study relevant to their industry',
        'Demo invite — next available slot',
      ],
      proposal: [
        'Follow up on proposal — no response in 48 hours',
        'Schedule proposal walkthrough call',
        'Address objections raised in discovery',
      ],
      negotiation: [
        'Send final pricing with limited-time incentive',
        'Loop in legal for contract review',
        'Confirm go-live timeline and success metrics',
      ],
      won: [
        'Send onboarding schedule and welcome kit',
        'Introduce customer success manager',
        'Schedule kickoff call',
      ],
      lost: [
        'Send graceful re-engagement email for 90-day follow-up',
        'Add to nurture sequence',
        'Request loss reason feedback',
      ],
    };
    const list = actions[stage] || actions['new'];
    return list[Math.floor(Math.random() * list.length)];
  }

  private demoEmail(name: string, company: string, _title: string, emailType: string): EmailResult {
    const first = name.split(' ')[0];

    const templates: Record<string, EmailResult> = {
      cold: {
        subject: `Quick question about ${company}'s sales process`,
        body:
          `Hi ${first},\n\n` +
          `I came across ${company} and noticed you're scaling your team — impressive trajectory.\n\n` +
          `We help companies like yours automate the lead-to-close pipeline using AI, ` +
          `cutting manual sales ops by 60% and improving close rates by 35%.\n\n` +
          `Specifically, I'd love to show you how we:\n` +
          `• Enrich and score every lead in seconds with AI\n` +
          `• Generate personalized outreach sequences automatically\n` +
          `• Surface the right next action for every deal in your pipeline\n\n` +
          `Would a 20-minute call this week make sense? ` +
          `Happy to send a quick Loom first if that's easier.\n\n` +
          `Best,\n[Your Name]`,
      },
      follow_up_1: {
        subject: `Re: ${company}'s sales pipeline`,
        body:
          `Hi ${first},\n\n` +
          `Following up on my note from a few days ago — I know things get busy.\n\n` +
          `One quick data point: a client in your industry reduced their average deal cycle ` +
          `from 52 to 31 days after deploying our AI pipeline automation.\n\n` +
          `Even a 20% improvement in pipeline velocity could mean significant revenue impact for ${company}.\n\n` +
          `Open to a quick 15-minute chat?\n\n` +
          `Best,\n[Your Name]`,
      },
      follow_up_2: {
        subject: `Last note — AI pipeline for ${company}`,
        body:
          `Hi ${first},\n\n` +
          `I'll keep this short — this will be my last reach-out for now.\n\n` +
          `If improving sales efficiency ever becomes a priority at ${company}, ` +
          `I'd love to reconnect. Our customers average 3.2x ROI in the first 6 months.\n\n` +
          `Hope to connect when the timing is right.\n\n` +
          `Best,\n[Your Name]`,
      },
      proposal: {
        subject: `Proposal: AI Lead-to-Deal System for ${company}`,
        body:
          `Hi ${first},\n\n` +
          `Thank you for the productive conversations — excited to present our formal proposal for ${company}.\n\n` +
          `Based on your goals, our 30-day implementation plan covers:\n` +
          `• AI lead enrichment & scoring (Days 1–7)\n` +
          `• Automated outreach sequence setup (Days 8–14)\n` +
          `• Pipeline analytics dashboard go-live (Days 15–21)\n` +
          `• Full team training and handoff (Days 22–30)\n\n` +
          `Expected 90-day outcomes:\n` +
          `• 45% reduction in manual lead research time\n` +
          `• 30% improvement in qualified pipeline volume\n` +
          `• 25% increase in close rate on scored leads\n\n` +
          `I'd love to walk you through the full proposal on a call — does Thursday or Friday work?\n\n` +
          `Looking forward to partnering with ${company}.\n\n` +
          `Best,\n[Your Name]`,
      },
    };

    return templates[emailType] || templates['cold'];
  }

  private demoReport(analytics: Record<string, unknown>): string {
    const total = Number(analytics['total_leads'] ?? 0);
    const value = Number(analytics['total_value'] ?? 0);
    const winRate = Number(analytics['win_rate'] ?? 0);
    const byStage = (analytics['by_stage'] as Record<string, number>) || {};
    const newCount = byStage['new'] ?? 0;
    const qualCount = byStage['qualified'] ?? 0;

    const valueFmt = value.toLocaleString('en-US', { maximumFractionDigits: 0 });

    return `## Executive Summary

Your pipeline contains **${total} leads** representing **$${valueFmt}** in total potential deal value. The current win rate of **${winRate.toFixed(1)}%** ${winRate > 25 ? 'exceeds' : 'is below'} the B2B benchmark of 25%. With ${newCount} leads in the new stage and ${qualCount} in qualification, immediate enrichment and scoring can unlock significant near-term revenue.

---

## Pipeline Health

### Stage Distribution
- **New leads** (${newCount}) should be enriched and scored within 24 hours — unworked leads decay fast
- **Qualification stage** is your highest-leverage conversion point — a 10% improvement here compounds through the entire funnel
- **Proposal and negotiation** leads need daily follow-up cadence to prevent deal stalling

### ICP Analysis
- High-fit leads (score 75+) should receive priority outreach and faster stage progression
- Medium-fit leads benefit from additional nurturing content before qualification calls
- Low-fit leads should move to a 90-day nurture sequence to free rep time

---

## Top Opportunities

- Leads with scores above 70 in proposal or negotiation stage represent your most immediate revenue risk if stalled
- SaaS and FinTech verticals show the highest close-rate correlation in your pipeline data
- Deals above $30K close 22% faster when proposals include specific ROI projections tied to the prospect's metrics

---

## Recommended Actions

- **Today:** Enrich and score all new leads older than 48 hours — AI enrichment takes 10 seconds
- **This week:** Send follow-up emails to every proposal sent more than 5 days ago without response
- **This month:** Run a win/loss debrief on all closed deals — top patterns inform your scoring model
- **Ongoing:** Maintain 3-touch minimum cadence before marking any lead as unresponsive`;
  }
}
