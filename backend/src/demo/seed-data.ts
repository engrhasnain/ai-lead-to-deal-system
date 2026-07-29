import { Prisma } from '@prisma/client';

/**
 * The 12 seeded demo leads + their activity trail, ported 1:1 from
 * backend-fastapi-archive/main.py::_create_demo_data. Shared by first-boot
 * seeding and the periodic public-demo reset job — do not duplicate this list.
 */

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function buildDemoLeads(now: Date): Prisma.LeadCreateManyInput[] {
  return [
    // ── Negotiation ──
    {
      name: 'Sarah Chen',
      email: 'sarah@techflow.io',
      company: 'TechFlow Solutions',
      title: 'VP of Sales',
      industry: 'SaaS',
      source: 'LinkedIn',
      stage: 'negotiation',
      score: 87,
      dealValue: 45000,
      icpFit: 'high',
      scoreReasoning:
        'Senior VP role with full budget authority. SaaS industry is our core ICP. Deal size and stage progression signal serious intent.',
      nextAction: 'Send final pricing with 10% early-adoption discount',
      aiSummary:
        'TechFlow Solutions is a fast-growing SaaS platform serving mid-market companies. Sarah Chen is the VP of Sales with direct budget authority. Strong ICP match.',
      notes: 'Very engaged on the last call. Wants to go live before Q3 end. Budget approved internally.',
      stageEnteredAt: daysAgo(now, 3),
      enrichedAt: daysAgo(now, 3),
      createdAt: daysAgo(now, 14),
      updatedAt: daysAgo(now, 1),
    },
    // ── Proposal ──
    {
      name: 'Marcus Williams',
      email: 'm.williams@finedge.com',
      company: 'FinEdge Capital',
      title: 'Chief Technology Officer',
      industry: 'FinTech',
      source: 'Referral',
      stage: 'proposal',
      score: 92,
      dealValue: 80000,
      icpFit: 'high',
      scoreReasoning:
        'CTO with complete procurement authority in a high-growth FinTech firm. Deal size and urgency signals make this a top-priority opportunity.',
      nextAction: 'Follow up on proposal — 6 days without response',
      aiSummary:
        'FinEdge Capital is a fintech firm managing $2B+ in assets with aggressive digital transformation goals. Marcus Williams as CTO has full authority over technology procurement.',
      notes: 'Sent proposal on Jun 7. No response yet. Try calling directly — he mentioned preferring calls over email.',
      stageEnteredAt: daysAgo(now, 19),
      enrichedAt: daysAgo(now, 7),
      createdAt: daysAgo(now, 18),
      updatedAt: daysAgo(now, 6),
    },
    {
      name: 'Emma Rodriguez',
      email: 'emma.r@vendorwise.com',
      company: 'VendorWise',
      title: 'VP of Product',
      industry: 'SaaS',
      source: 'Website',
      stage: 'proposal',
      score: 71,
      dealValue: 35000,
      icpFit: 'medium',
      scoreReasoning:
        'VP-level role with meaningful product investment authority. SaaS industry aligns well with our core ICP.',
      nextAction: 'Clarify integration requirements raised in discovery call',
      aiSummary:
        'VendorWise is a B2B procurement platform gaining traction in mid-market. Emma’s VP role oversees product investments and has flagged AI automation as a Q3 priority.',
      stageEnteredAt: daysAgo(now, 8),
      enrichedAt: daysAgo(now, 5),
      createdAt: daysAgo(now, 10),
      updatedAt: daysAgo(now, 5),
    },
    // ── Qualified ──
    {
      name: "James O'Brien",
      email: 'jobrien@healthspan.org',
      company: 'HealthSpan Analytics',
      title: 'CEO',
      industry: 'Healthcare',
      source: 'LinkedIn',
      stage: 'qualified',
      score: 78,
      dealValue: 60000,
      icpFit: 'high',
      scoreReasoning:
        'CEO with full procurement authority at a healthcare analytics firm. Digital efficiency is a stated board-level priority.',
      nextAction: 'Send healthcare ROI case study before next call',
      aiSummary:
        'HealthSpan Analytics is a clinical data intelligence company backed by Series B funding. As CEO, James has full procurement authority.',
      stageEnteredAt: daysAgo(now, 12),
      enrichedAt: daysAgo(now, 8),
      createdAt: daysAgo(now, 20),
      updatedAt: daysAgo(now, 7),
    },
    {
      name: 'Priya Sharma',
      email: 'priya@retailboost.co',
      company: 'RetailBoost',
      title: 'Director of Operations',
      industry: 'E-Commerce',
      source: 'Website',
      stage: 'qualified',
      score: 64,
      dealValue: 22000,
      icpFit: 'medium',
      scoreReasoning: 'Director-level ops role with vendor influence in a fast-growing e-commerce company.',
      nextAction: 'Schedule discovery call to understand integration requirements',
      aiSummary:
        "RetailBoost is an e-commerce enablement platform scaling rapidly. Priya's operations role gives her influence over vendor decisions.",
      stageEnteredAt: daysAgo(now, 6),
      enrichedAt: daysAgo(now, 6),
      createdAt: daysAgo(now, 15),
      updatedAt: daysAgo(now, 6),
    },
    // ── New ──
    {
      name: 'Daniel Park',
      email: 'dpark@cloudburst.dev',
      company: 'CloudBurst Labs',
      title: 'Founder & CEO',
      industry: 'SaaS',
      source: 'Conference',
      stage: 'new',
      dealValue: 30000,
      stageEnteredAt: daysAgo(now, 2),
      createdAt: daysAgo(now, 2),
      updatedAt: daysAgo(now, 2),
    },
    {
      name: 'Aisha Okonkwo',
      email: 'a.okonkwo@logistiq.ng',
      company: 'LogistiQ Africa',
      title: 'Head of Technology',
      industry: 'Logistics',
      source: 'Cold Outreach',
      stage: 'new',
      score: 55,
      dealValue: 18000,
      icpFit: 'medium',
      scoreReasoning: 'Technology Head role with procurement influence in a logistics tech company.',
      nextAction: 'Send personalized cold outreach with logistics automation angle',
      aiSummary: 'LogistiQ Africa is a growing logistics technology company expanding across West Africa.',
      stageEnteredAt: daysAgo(now, 4),
      enrichedAt: daysAgo(now, 1),
      createdAt: daysAgo(now, 4),
      updatedAt: daysAgo(now, 1),
    },
    {
      name: 'Rajiv Menon',
      email: 'rajiv@constructai.in',
      company: 'ConstructAI',
      title: 'Chief Operating Officer',
      industry: 'Construction Tech',
      source: 'Referral',
      stage: 'new',
      dealValue: 25000,
      stageEnteredAt: daysAgo(now, 1),
      createdAt: daysAgo(now, 1),
      updatedAt: daysAgo(now, 1),
    },
    // ── Won ──
    {
      name: 'Sofia Petrov',
      email: 'sofia@fintech-kz.com',
      company: 'KazFinTech',
      title: 'Head of Digital Transformation',
      industry: 'FinTech',
      source: 'LinkedIn',
      stage: 'won',
      score: 83,
      dealValue: 55000,
      icpFit: 'high',
      scoreReasoning: 'Senior digital transformation leader with full project authority.',
      nextAction: 'Send onboarding schedule and introduce CSM',
      aiSummary:
        "KazFinTech is the leading fintech platform in Central Asia. Sofia led their digital transformation initiative.",
      stageEnteredAt: daysAgo(now, 8),
      enrichedAt: daysAgo(now, 35),
      createdAt: daysAgo(now, 45),
      updatedAt: daysAgo(now, 8),
    },
    {
      name: 'Ahmed Hassan',
      email: 'ahmed@tradeboost.ae',
      company: 'TradeBoost MENA',
      title: 'Chief Revenue Officer',
      industry: 'E-Commerce',
      source: 'Conference',
      stage: 'won',
      score: 90,
      dealValue: 70000,
      icpFit: 'high',
      scoreReasoning: 'CRO with full budget authority and high urgency. Closed in 19 days.',
      nextAction: 'Schedule quarterly business review for next month',
      aiSummary:
        'TradeBoost MENA is a fast-growing cross-border trade platform. Ahmed as CRO had direct authority and high urgency.',
      stageEnteredAt: daysAgo(now, 10),
      enrichedAt: daysAgo(now, 30),
      createdAt: daysAgo(now, 40),
      updatedAt: daysAgo(now, 10),
    },
    // ── Lost ──
    {
      name: 'Lisa Tan',
      email: 'lisa@mediaplex.sg',
      company: 'MediaPlex Asia',
      title: 'Marketing Director',
      industry: 'Media & Advertising',
      source: 'Website',
      stage: 'lost',
      score: 38,
      dealValue: 15000,
      icpFit: 'low',
      lostReason: 'Price',
      scoreReasoning: 'Marketing Director title lacks direct procurement authority. Media industry is below core ICP.',
      nextAction: 'Add to 90-day nurture sequence for re-engagement',
      aiSummary:
        "MediaPlex Asia is a digital advertising agency. Lisa's marketing role influences but does not control technology procurement.",
      stageEnteredAt: daysAgo(now, 15),
      enrichedAt: daysAgo(now, 20),
      createdAt: daysAgo(now, 30),
      updatedAt: daysAgo(now, 15),
    },
    {
      name: 'Tom Bradley',
      email: 't.bradley@legacyops.co',
      company: 'LegacyOps Corp',
      title: 'IT Manager',
      industry: 'Manufacturing',
      source: 'Cold Outreach',
      stage: 'lost',
      score: 25,
      dealValue: 8000,
      icpFit: 'low',
      lostReason: 'Competitor',
      scoreReasoning:
        'IT Manager at a traditional manufacturing company signals long approval cycles and conservative budgets.',
      nextAction: 'Re-engage in Q1 next year if budget cycle resets',
      aiSummary: 'LegacyOps Corp is a traditional manufacturing company with cautious technology adoption practices.',
      stageEnteredAt: daysAgo(now, 18),
      enrichedAt: daysAgo(now, 22),
      createdAt: daysAgo(now, 35),
      updatedAt: daysAgo(now, 18),
    },
  ];
}

/**
 * Builds the seed activity trail. `leadIds` must be the IDs of the 12 leads
 * just inserted, in the same order as `buildDemoLeads` — index N here maps
 * to `demo_leads[N]` in the Python source.
 */
export function buildDemoActivities(leadIds: number[], now: Date): Prisma.LeadActivityCreateManyInput[] {
  return [
    {
      leadId: leadIds[0],
      eventType: 'stage_change',
      description: 'Moved to Negotiation — pricing discussion started',
      createdAt: daysAgo(now, 3),
    },
    {
      leadId: leadIds[0],
      eventType: 'email_sent',
      description: 'Proposal email sent — awaiting response',
      createdAt: daysAgo(now, 5),
    },
    {
      leadId: leadIds[0],
      eventType: 'enriched',
      description: 'AI enriched: ICP High, SaaS VP with full budget authority',
      createdAt: daysAgo(now, 3),
    },
    {
      leadId: leadIds[1],
      eventType: 'stage_change',
      description: 'Moved to Proposal — formal proposal sent',
      createdAt: daysAgo(now, 19),
    },
    {
      leadId: leadIds[1],
      eventType: 'scored',
      description: 'AI scored 92/100 — top priority lead',
      createdAt: daysAgo(now, 7),
    },
    {
      leadId: leadIds[2],
      eventType: 'enriched',
      description: 'AI enriched: ICP Medium, product VP with Q3 mandate',
      createdAt: daysAgo(now, 5),
    },
    {
      leadId: leadIds[3],
      eventType: 'stage_change',
      description: 'Moved to Qualified after discovery call',
      createdAt: daysAgo(now, 12),
    },
    {
      leadId: leadIds[3],
      eventType: 'email_sent',
      description: 'Cold outreach sent — personalized for healthcare sector',
      createdAt: daysAgo(now, 20),
    },
    {
      leadId: leadIds[6],
      eventType: 'enriched',
      description: 'AI enriched: ICP Medium, logistics tech buyer',
      createdAt: daysAgo(now, 1),
    },
    {
      leadId: leadIds[8],
      eventType: 'stage_change',
      description: 'Closed Won — $55,000 deal signed',
      createdAt: daysAgo(now, 8),
    },
    {
      leadId: leadIds[9],
      eventType: 'stage_change',
      description: 'Closed Won — $70,000 deal signed in 19 days',
      createdAt: daysAgo(now, 10),
    },
  ];
}
