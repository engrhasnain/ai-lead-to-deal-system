import os
import json
import random

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

try:
    import anthropic
    _client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
except Exception:
    _client = None
    DEMO_MODE = True


# ── Live Claude calls ─────────────────────────────────────

async def enrich_lead(name: str, company: str, title: str, industry: str) -> dict:
    if DEMO_MODE or not _client:
        return _demo_enrichment(name, company, title, industry)

    prompt = f"""You are a B2B sales intelligence AI. Enrich this lead and return JSON only.

Lead: {name} | {title} at {company} | Industry: {industry}

Return JSON with exactly these fields:
{{
  "ai_summary": "2-3 sentence company and contact summary focused on sales relevance",
  "icp_fit": "high" | "medium" | "low"
}}"""

    try:
        msg = await _client.messages.create(
            model="claude-sonnet-4-6", max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except Exception:
        return _demo_enrichment(name, company, title, industry)


async def score_lead(name: str, company: str, title: str, industry: str,
                     deal_value: float | None, stage: str, ai_summary: str | None) -> dict:
    if DEMO_MODE or not _client:
        return _demo_score(title, industry, deal_value)

    prompt = f"""You are a B2B sales scoring AI. Score this lead 0-100 and return JSON only.

Lead: {name} | {title} at {company} | Industry: {industry}
Deal Value: ${deal_value or "Unknown"} | Stage: {stage}
Context: {ai_summary or "Not enriched"}

Score criteria: title seniority (40%), industry fit (30%), deal size (20%), stage progression (10%).

Return JSON:
{{
  "score": <integer 0-100>,
  "score_reasoning": "2-sentence explanation",
  "recommended_stage": "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
}}"""

    try:
        msg = await _client.messages.create(
            model="claude-sonnet-4-6", max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except Exception:
        return _demo_score(title, industry, deal_value)


async def generate_next_action(name: str, company: str, stage: str,
                                score: int | None, industry: str) -> str:
    if DEMO_MODE or not _client:
        return _demo_next_action(stage, score)

    prompt = f"""You are a sales coach AI. Suggest ONE specific next action for this lead.
Return only the action text, no explanation, max 12 words.

{name} at {company} ({industry}) | Stage: {stage} | Score: {score or "unscored"}"""

    try:
        msg = await _client.messages.create(
            model="claude-sonnet-4-6", max_tokens=60,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text.strip().strip('"')
    except Exception:
        return _demo_next_action(stage, score)


async def generate_email(name: str, company: str, title: str, industry: str,
                         ai_summary: str | None, email_type: str) -> dict:
    if DEMO_MODE or not _client:
        return _demo_email(name, company, title, email_type)

    labels = {
        "cold":        "initial cold outreach email",
        "follow_up_1": "first follow-up (3 days after cold email)",
        "follow_up_2": "second follow-up (7 days, final touch)",
        "proposal":    "formal proposal presentation email",
    }

    prompt = f"""Write a professional B2B sales email: {labels.get(email_type, "cold outreach")}.
Prospect: {name}, {title} at {company} ({industry})
Context: {ai_summary or "No enrichment data yet"}

Return JSON:
{{
  "subject": "concise subject line",
  "body": "full email body with \\n line breaks, 150-200 words, professional but human tone"
}}"""

    try:
        msg = await _client.messages.create(
            model="claude-sonnet-4-6", max_tokens=700,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except Exception:
        return _demo_email(name, company, title, email_type)


async def generate_pipeline_report(analytics: dict) -> str:
    if DEMO_MODE or not _client:
        return _demo_report(analytics)

    prompt = f"""You are a sales intelligence AI. Write a concise pipeline health report.

Data: {json.dumps(analytics, indent=2)}

Write a structured report with: ## Executive Summary, ## Pipeline Health, ## Top Opportunities, ## Recommended Actions.
Use markdown bullet points. Be specific with numbers. Max 400 words."""

    try:
        msg = await _client.messages.create(
            model="claude-sonnet-4-6", max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text.strip()
    except Exception:
        return _demo_report(analytics)


# ── Demo data generators ──────────────────────────────────

def _demo_enrichment(name: str, company: str, title: str, industry: str) -> dict:
    senior = any(w in title.lower() for w in ["ceo", "cto", "coo", "vp", "director", "head", "chief", "founder", "president"])
    fit_ind = industry.lower() in ["saas", "technology", "fintech", "healthcare", "e-commerce", "logistics"]
    icp = "high" if (senior and fit_ind) else ("medium" if (senior or fit_ind) else "low")

    summaries = {
        "high": (
            f"{company} is a high-growth organization in the {industry} space with strong technology adoption signals. "
            f"{name} holds a senior decision-making role with direct influence over vendor procurement and technology investments. "
            f"Exceptional ICP match — priority outreach recommended."
        ),
        "medium": (
            f"{company} operates in the {industry} sector with moderate growth indicators. "
            f"{name}'s role suggests meaningful influence over purchasing decisions, though executive alignment may be needed for final sign-off. "
            f"Worth qualifying further with a discovery call."
        ),
        "low": (
            f"{company} is an emerging player in {industry} with limited signals of near-term technology investment. "
            f"{name}'s position may not carry direct procurement authority. "
            f"Longer sales cycle expected — consider nurture sequence before active outreach."
        ),
    }

    return {"ai_summary": summaries[icp], "icp_fit": icp}


def _demo_score(title: str, industry: str, deal_value: float | None) -> dict:
    base = 35
    if any(w in title.lower() for w in ["ceo", "cto", "coo", "founder", "president"]):
        base += 35
    elif any(w in title.lower() for w in ["vp", "vice president", "director", "head"]):
        base += 25
    elif any(w in title.lower() for w in ["manager", "lead", "senior"]):
        base += 12

    if industry.lower() in ["saas", "fintech", "technology"]:
        base += 15
    elif industry.lower() in ["healthcare", "e-commerce", "logistics"]:
        base += 8

    if deal_value:
        if deal_value >= 50000:
            base += 10
        elif deal_value >= 15000:
            base += 5

    score = min(97, max(18, base + random.randint(-4, 6)))

    if score >= 75:
        reasoning = "Senior decision-maker with direct budget authority scores high on our ICP index. Industry alignment and deal size both signal strong fit and genuine intent."
        rec = "proposal"
    elif score >= 50:
        reasoning = "Moderate seniority and reasonable industry fit. Needs further qualification to confirm budget and decision timeline before advancing."
        rec = "qualified"
    else:
        reasoning = "Limited title authority and below-core-ICP industry. Longer sales cycle expected with additional stakeholder touchpoints required."
        rec = "new"

    return {"score": score, "score_reasoning": reasoning, "recommended_stage": rec}


def _demo_next_action(stage: str, score: int | None) -> str:
    actions = {
        "new":         ["Send personalized cold outreach email today", "Research company pain points before first contact", "Connect on LinkedIn with value-add insight"],
        "qualified":   ["Schedule 30-min discovery call this week", "Send ROI case study relevant to their industry", "Demo invite — next available slot"],
        "proposal":    ["Follow up on proposal — no response in 48 hours", "Schedule proposal walkthrough call", "Address objections raised in discovery"],
        "negotiation": ["Send final pricing with limited-time incentive", "Loop in legal for contract review", "Confirm go-live timeline and success metrics"],
        "won":         ["Send onboarding schedule and welcome kit", "Introduce customer success manager", "Schedule kickoff call"],
        "lost":        ["Send graceful re-engagement email for 90-day follow-up", "Add to nurture sequence", "Request loss reason feedback"],
    }
    return random.choice(actions.get(stage, actions["new"]))


def _demo_email(name: str, company: str, title: str, email_type: str) -> dict:
    first = name.split()[0]

    templates = {
        "cold": {
            "subject": f"Quick question about {company}'s sales process",
            "body": (
                f"Hi {first},\n\n"
                f"I came across {company} and noticed you're scaling your team — impressive trajectory.\n\n"
                f"We help companies like yours automate the lead-to-close pipeline using AI, "
                f"cutting manual sales ops by 60% and improving close rates by 35%.\n\n"
                f"Specifically, I'd love to show you how we:\n"
                f"• Enrich and score every lead in seconds with AI\n"
                f"• Generate personalized outreach sequences automatically\n"
                f"• Surface the right next action for every deal in your pipeline\n\n"
                f"Would a 20-minute call this week make sense? "
                f"Happy to send a quick Loom first if that's easier.\n\n"
                f"Best,\n[Your Name]"
            ),
        },
        "follow_up_1": {
            "subject": f"Re: {company}'s sales pipeline",
            "body": (
                f"Hi {first},\n\n"
                f"Following up on my note from a few days ago — I know things get busy.\n\n"
                f"One quick data point: a client in your industry reduced their average deal cycle "
                f"from 52 to 31 days after deploying our AI pipeline automation.\n\n"
                f"Even a 20% improvement in pipeline velocity could mean significant revenue impact for {company}.\n\n"
                f"Open to a quick 15-minute chat?\n\n"
                f"Best,\n[Your Name]"
            ),
        },
        "follow_up_2": {
            "subject": f"Last note — AI pipeline for {company}",
            "body": (
                f"Hi {first},\n\n"
                f"I'll keep this short — this will be my last reach-out for now.\n\n"
                f"If improving sales efficiency ever becomes a priority at {company}, "
                f"I'd love to reconnect. Our customers average 3.2x ROI in the first 6 months.\n\n"
                f"Hope to connect when the timing is right.\n\n"
                f"Best,\n[Your Name]"
            ),
        },
        "proposal": {
            "subject": f"Proposal: AI Lead-to-Deal System for {company}",
            "body": (
                f"Hi {first},\n\n"
                f"Thank you for the productive conversations — excited to present our formal proposal for {company}.\n\n"
                f"Based on your goals, our 30-day implementation plan covers:\n"
                f"• AI lead enrichment & scoring (Days 1–7)\n"
                f"• Automated outreach sequence setup (Days 8–14)\n"
                f"• Pipeline analytics dashboard go-live (Days 15–21)\n"
                f"• Full team training and handoff (Days 22–30)\n\n"
                f"Expected 90-day outcomes:\n"
                f"• 45% reduction in manual lead research time\n"
                f"• 30% improvement in qualified pipeline volume\n"
                f"• 25% increase in close rate on scored leads\n\n"
                f"I'd love to walk you through the full proposal on a call — does Thursday or Friday work?\n\n"
                f"Looking forward to partnering with {company}.\n\n"
                f"Best,\n[Your Name]"
            ),
        },
    }

    return templates.get(email_type, templates["cold"])


def _demo_report(analytics: dict) -> str:
    total = analytics.get("total_leads", 0)
    value = analytics.get("total_value", 0)
    win_rate = analytics.get("win_rate", 0)
    by_stage = analytics.get("by_stage", {})
    new_count = by_stage.get("new", 0)
    qual_count = by_stage.get("qualified", 0)

    return f"""## Executive Summary

Your pipeline contains **{total} leads** representing **${value:,.0f}** in total potential deal value. The current win rate of **{win_rate:.1f}%** {"exceeds" if win_rate > 25 else "is below"} the B2B benchmark of 25%. With {new_count} leads in the new stage and {qual_count} in qualification, immediate enrichment and scoring can unlock significant near-term revenue.

---

## Pipeline Health

### Stage Distribution
- **New leads** ({new_count}) should be enriched and scored within 24 hours — unworked leads decay fast
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
- **Ongoing:** Maintain 3-touch minimum cadence before marking any lead as unresponsive"""
