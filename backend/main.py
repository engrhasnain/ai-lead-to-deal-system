import os
from collections import Counter
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # populate os.environ from .env before any config below is read

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from database import get_db, init_db, AsyncSessionLocal
from models import Lead, Email, LeadActivity
from schemas import (
    LeadCreate, LeadUpdate, LeadOut,
    EmailOut, EmailGenRequest, PipelineAnalytics,
    DashboardData, DashboardLeadItem, DashboardActivity,
    ForecastData, ForecastStage, LeadActivityOut,
)
import ai


# ── Public demo configuration ────────────────────────────────

PUBLIC_DEMO_MODE = os.getenv("PUBLIC_DEMO_MODE", "true").lower() == "true"
DEMO_RESET_INTERVAL_MINUTES = int(os.getenv("DEMO_RESET_INTERVAL_MINUTES", "60"))
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:3000").split(",")
    if o.strip()
]

AI_RATE_LIMIT = "20/hour"
READ_RATE_LIMIT = "120/hour"

limiter = Limiter(key_func=get_remote_address)


async def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Demo rate limit reached — please try again shortly."},
    )


def _block_if_public_demo() -> None:
    """Guard for destructive endpoints — disabled entirely in public demo mode."""
    if PUBLIC_DEMO_MODE:
        raise HTTPException(403, "Disabled in the public demo")


# ── Helpers ────────────────────────────────────────────────

def _time_ago(dt: datetime) -> str:
    delta = datetime.utcnow() - dt
    s = int(delta.total_seconds())
    if s < 3600:   return f"{s // 60}m ago"
    if s < 86400:  return f"{s // 3600}h ago"
    return f"{delta.days}d ago"


async def _log(db: AsyncSession, lead_id: int, event_type: str, description: str) -> None:
    db.add(LeadActivity(lead_id=lead_id, event_type=event_type, description=description))


# ── Seed data ──────────────────────────────────────────────

async def _create_demo_data(db: AsyncSession) -> None:
        """Build the 12 seeded demo leads + their activity trail. Shared by first-boot
        seeding and the periodic public-demo reset job — do not duplicate this list."""
        now = datetime.utcnow()

        demo_leads = [
            # ── Negotiation ──
            Lead(
                name="Sarah Chen", email="sarah@techflow.io",
                company="TechFlow Solutions", title="VP of Sales", industry="SaaS",
                source="LinkedIn", stage="negotiation", score=87, deal_value=45000,
                icp_fit="high",
                score_reasoning="Senior VP role with full budget authority. SaaS industry is our core ICP. Deal size and stage progression signal serious intent.",
                next_action="Send final pricing with 10% early-adoption discount",
                ai_summary="TechFlow Solutions is a fast-growing SaaS platform serving mid-market companies. Sarah Chen is the VP of Sales with direct budget authority. Strong ICP match.",
                notes="Very engaged on the last call. Wants to go live before Q3 end. Budget approved internally.",
                stage_entered_at=now - timedelta(days=3),
                enriched_at=now - timedelta(days=3),
                created_at=now - timedelta(days=14), updated_at=now - timedelta(days=1),
            ),
            # ── Proposal ──
            Lead(
                name="Marcus Williams", email="m.williams@finedge.com",
                company="FinEdge Capital", title="Chief Technology Officer", industry="FinTech",
                source="Referral", stage="proposal", score=92, deal_value=80000,
                icp_fit="high",
                score_reasoning="CTO with complete procurement authority in a high-growth FinTech firm. Deal size and urgency signals make this a top-priority opportunity.",
                next_action="Follow up on proposal — 6 days without response",
                ai_summary="FinEdge Capital is a fintech firm managing $2B+ in assets with aggressive digital transformation goals. Marcus Williams as CTO has full authority over technology procurement.",
                notes="Sent proposal on Jun 7. No response yet. Try calling directly — he mentioned preferring calls over email.",
                stage_entered_at=now - timedelta(days=19),
                enriched_at=now - timedelta(days=7),
                created_at=now - timedelta(days=18), updated_at=now - timedelta(days=6),
            ),
            Lead(
                name="Emma Rodriguez", email="emma.r@vendorwise.com",
                company="VendorWise", title="VP of Product", industry="SaaS",
                source="Website", stage="proposal", score=71, deal_value=35000,
                icp_fit="medium",
                score_reasoning="VP-level role with meaningful product investment authority. SaaS industry aligns well with our core ICP.",
                next_action="Clarify integration requirements raised in discovery call",
                ai_summary="VendorWise is a B2B procurement platform gaining traction in mid-market. Emma's VP role oversees product investments and has flagged AI automation as a Q3 priority.",
                stage_entered_at=now - timedelta(days=8),
                enriched_at=now - timedelta(days=5),
                created_at=now - timedelta(days=10), updated_at=now - timedelta(days=5),
            ),
            # ── Qualified ──
            Lead(
                name="James O'Brien", email="jobrien@healthspan.org",
                company="HealthSpan Analytics", title="CEO", industry="Healthcare",
                source="LinkedIn", stage="qualified", score=78, deal_value=60000,
                icp_fit="high",
                score_reasoning="CEO with full procurement authority at a healthcare analytics firm. Digital efficiency is a stated board-level priority.",
                next_action="Send healthcare ROI case study before next call",
                ai_summary="HealthSpan Analytics is a clinical data intelligence company backed by Series B funding. As CEO, James has full procurement authority.",
                stage_entered_at=now - timedelta(days=12),
                enriched_at=now - timedelta(days=8),
                created_at=now - timedelta(days=20), updated_at=now - timedelta(days=7),
            ),
            Lead(
                name="Priya Sharma", email="priya@retailboost.co",
                company="RetailBoost", title="Director of Operations", industry="E-Commerce",
                source="Website", stage="qualified", score=64, deal_value=22000,
                icp_fit="medium",
                score_reasoning="Director-level ops role with vendor influence in a fast-growing e-commerce company.",
                next_action="Schedule discovery call to understand integration requirements",
                ai_summary="RetailBoost is an e-commerce enablement platform scaling rapidly. Priya's operations role gives her influence over vendor decisions.",
                stage_entered_at=now - timedelta(days=6),
                enriched_at=now - timedelta(days=6),
                created_at=now - timedelta(days=15), updated_at=now - timedelta(days=6),
            ),
            # ── New ──
            Lead(
                name="Daniel Park", email="dpark@cloudburst.dev",
                company="CloudBurst Labs", title="Founder & CEO", industry="SaaS",
                source="Conference", stage="new", deal_value=30000,
                stage_entered_at=now - timedelta(days=2),
                created_at=now - timedelta(days=2), updated_at=now - timedelta(days=2),
            ),
            Lead(
                name="Aisha Okonkwo", email="a.okonkwo@logistiq.ng",
                company="LogistiQ Africa", title="Head of Technology", industry="Logistics",
                source="Cold Outreach", stage="new", score=55, deal_value=18000,
                icp_fit="medium",
                score_reasoning="Technology Head role with procurement influence in a logistics tech company.",
                next_action="Send personalized cold outreach with logistics automation angle",
                ai_summary="LogistiQ Africa is a growing logistics technology company expanding across West Africa.",
                stage_entered_at=now - timedelta(days=4),
                enriched_at=now - timedelta(days=1),
                created_at=now - timedelta(days=4), updated_at=now - timedelta(days=1),
            ),
            Lead(
                name="Rajiv Menon", email="rajiv@constructai.in",
                company="ConstructAI", title="Chief Operating Officer", industry="Construction Tech",
                source="Referral", stage="new", deal_value=25000,
                stage_entered_at=now - timedelta(days=1),
                created_at=now - timedelta(days=1), updated_at=now - timedelta(days=1),
            ),
            # ── Won ──
            Lead(
                name="Sofia Petrov", email="sofia@fintech-kz.com",
                company="KazFinTech", title="Head of Digital Transformation", industry="FinTech",
                source="LinkedIn", stage="won", score=83, deal_value=55000,
                icp_fit="high",
                score_reasoning="Senior digital transformation leader with full project authority.",
                next_action="Send onboarding schedule and introduce CSM",
                ai_summary="KazFinTech is the leading fintech platform in Central Asia. Sofia led their digital transformation initiative.",
                stage_entered_at=now - timedelta(days=8),
                enriched_at=now - timedelta(days=35),
                created_at=now - timedelta(days=45), updated_at=now - timedelta(days=8),
            ),
            Lead(
                name="Ahmed Hassan", email="ahmed@tradeboost.ae",
                company="TradeBoost MENA", title="Chief Revenue Officer", industry="E-Commerce",
                source="Conference", stage="won", score=90, deal_value=70000,
                icp_fit="high",
                score_reasoning="CRO with full budget authority and high urgency. Closed in 19 days.",
                next_action="Schedule quarterly business review for next month",
                ai_summary="TradeBoost MENA is a fast-growing cross-border trade platform. Ahmed as CRO had direct authority and high urgency.",
                stage_entered_at=now - timedelta(days=10),
                enriched_at=now - timedelta(days=30),
                created_at=now - timedelta(days=40), updated_at=now - timedelta(days=10),
            ),
            # ── Lost ──
            Lead(
                name="Lisa Tan", email="lisa@mediaplex.sg",
                company="MediaPlex Asia", title="Marketing Director", industry="Media & Advertising",
                source="Website", stage="lost", score=38, deal_value=15000,
                icp_fit="low",
                lost_reason="Price",
                score_reasoning="Marketing Director title lacks direct procurement authority. Media industry is below core ICP.",
                next_action="Add to 90-day nurture sequence for re-engagement",
                ai_summary="MediaPlex Asia is a digital advertising agency. Lisa's marketing role influences but does not control technology procurement.",
                stage_entered_at=now - timedelta(days=15),
                enriched_at=now - timedelta(days=20),
                created_at=now - timedelta(days=30), updated_at=now - timedelta(days=15),
            ),
            Lead(
                name="Tom Bradley", email="t.bradley@legacyops.co",
                company="LegacyOps Corp", title="IT Manager", industry="Manufacturing",
                source="Cold Outreach", stage="lost", score=25, deal_value=8000,
                icp_fit="low",
                lost_reason="Competitor",
                score_reasoning="IT Manager at a traditional manufacturing company signals long approval cycles and conservative budgets.",
                next_action="Re-engage in Q1 next year if budget cycle resets",
                ai_summary="LegacyOps Corp is a traditional manufacturing company with cautious technology adoption practices.",
                stage_entered_at=now - timedelta(days=18),
                enriched_at=now - timedelta(days=22),
                created_at=now - timedelta(days=35), updated_at=now - timedelta(days=18),
            ),
        ]

        db.add_all(demo_leads)
        await db.flush()  # get IDs

        # Seed activities for key leads
        activities = [
            LeadActivity(lead_id=demo_leads[0].id, event_type="stage_change",
                description="Moved to Negotiation — pricing discussion started",
                created_at=now - timedelta(days=3)),
            LeadActivity(lead_id=demo_leads[0].id, event_type="email_sent",
                description="Proposal email sent — awaiting response",
                created_at=now - timedelta(days=5)),
            LeadActivity(lead_id=demo_leads[0].id, event_type="enriched",
                description="AI enriched: ICP High, SaaS VP with full budget authority",
                created_at=now - timedelta(days=3)),
            LeadActivity(lead_id=demo_leads[1].id, event_type="stage_change",
                description="Moved to Proposal — formal proposal sent",
                created_at=now - timedelta(days=19)),
            LeadActivity(lead_id=demo_leads[1].id, event_type="scored",
                description="AI scored 92/100 — top priority lead",
                created_at=now - timedelta(days=7)),
            LeadActivity(lead_id=demo_leads[2].id, event_type="enriched",
                description="AI enriched: ICP Medium, product VP with Q3 mandate",
                created_at=now - timedelta(days=5)),
            LeadActivity(lead_id=demo_leads[3].id, event_type="stage_change",
                description="Moved to Qualified after discovery call",
                created_at=now - timedelta(days=12)),
            LeadActivity(lead_id=demo_leads[3].id, event_type="email_sent",
                description="Cold outreach sent — personalized for healthcare sector",
                created_at=now - timedelta(days=20)),
            LeadActivity(lead_id=demo_leads[6].id, event_type="enriched",
                description="AI enriched: ICP Medium, logistics tech buyer",
                created_at=now - timedelta(days=1)),
            LeadActivity(lead_id=demo_leads[8].id, event_type="stage_change",
                description="Closed Won — $55,000 deal signed",
                created_at=now - timedelta(days=8)),
            LeadActivity(lead_id=demo_leads[9].id, event_type="stage_change",
                description="Closed Won — $70,000 deal signed in 19 days",
                created_at=now - timedelta(days=10)),
        ]
        db.add_all(activities)
        await db.commit()


async def seed_demo_data() -> None:
    async with AsyncSessionLocal() as db:
        count = await db.scalar(select(func.count()).select_from(Lead))
        if count and count > 0:
            return
        await _create_demo_data(db)


async def reset_demo_data() -> None:
    """Wipe all leads/emails/activities and re-seed the original 12 demo leads.
    Runs on a timer in public demo mode so accumulated visitor activity doesn't
    degrade the shared dataset over time."""
    async with AsyncSessionLocal() as db:
        await db.execute(delete(LeadActivity))
        await db.execute(delete(Email))
        await db.execute(delete(Lead))
        await db.commit()
        await _create_demo_data(db)


# ── App startup ────────────────────────────────────────────

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_demo_data()
    if PUBLIC_DEMO_MODE:
        scheduler.add_job(
            reset_demo_data, "interval",
            minutes=DEMO_RESET_INTERVAL_MINUTES, id="demo_reset",
        )
        scheduler.start()
    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="AI Lead-to-Deal API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=None if PUBLIC_DEMO_MODE else "/docs",
    redoc_url=None if PUBLIC_DEMO_MODE else "/redoc",
    openapi_url=None if PUBLIC_DEMO_MODE else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Dashboard ──────────────────────────────────────────────

@app.get("/dashboard", response_model=DashboardData)
@limiter.limit(READ_RATE_LIMIT)
async def dashboard(request: Request, db: AsyncSession = Depends(get_db)):
    leads = (await db.execute(select(Lead))).scalars().all()
    now   = datetime.utcnow()

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    q_month     = ((now.month - 1) // 3) * 3 + 1
    quarter_start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)

    pipeline_value  = sum(l.deal_value or 0 for l in leads if l.stage not in ("won", "lost"))
    won_this_month  = sum(l.deal_value or 0 for l in leads
                         if l.stage == "won" and l.updated_at >= month_start)
    won_this_quarter = sum(l.deal_value or 0 for l in leads
                          if l.stage == "won" and l.updated_at >= quarter_start)

    # AI actions = enrichments + scores + emails generated
    all_emails = (await db.execute(select(Email))).scalars().all()
    ai_actions = (
        sum(1 for l in leads if l.enriched_at) +
        sum(1 for l in leads if l.score is not None) +
        len(all_emails)
    )

    def days_in(lead: Lead) -> int:
        if not lead.stage_entered_at:
            return 0
        return max(0, (now - lead.stage_entered_at).days)

    def to_item(lead: Lead) -> DashboardLeadItem:
        return DashboardLeadItem(
            id=lead.id, name=lead.name, company=lead.company,
            stage=lead.stage, score=lead.score, deal_value=lead.deal_value,
            days_in_stage=days_in(lead), icp_fit=lead.icp_fit,
        )

    # Deals closing this week: proposal + negotiation, sorted by score desc
    closing = sorted(
        [l for l in leads if l.stage in ("proposal", "negotiation")],
        key=lambda l: l.score or 0, reverse=True,
    )[:6]

    # Top leads by score (excluding won/lost)
    top = sorted(
        [l for l in leads if l.score and l.stage not in ("won", "lost")],
        key=lambda l: l.score, reverse=True,
    )[:5]

    # Recent activities
    acts = (await db.execute(
        select(LeadActivity).join(Lead).order_by(LeadActivity.created_at.desc()).limit(8)
    )).scalars().all()

    recent = [
        DashboardActivity(
            event_type=a.event_type,
            description=a.description,
            lead_name=a.lead.name if a.lead else "Unknown",
            time_ago=_time_ago(a.created_at),
        )
        for a in acts
    ]

    return DashboardData(
        total_leads=len(leads),
        pipeline_value=pipeline_value,
        won_this_month=won_this_month,
        won_this_quarter=won_this_quarter,
        ai_actions_total=ai_actions,
        deals_closing_week=[to_item(l) for l in closing],
        top_leads=[to_item(l) for l in top],
        recent_activities=recent,
        quota_target=500000,
        quota_achieved=won_this_quarter,
    )


# ── Leads CRUD ─────────────────────────────────────────────

@app.get("/leads", response_model=list[LeadOut])
@limiter.limit(READ_RATE_LIMIT)
async def list_leads(request: Request, stage: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Lead).order_by(Lead.created_at.desc())
    if stage:
        q = q.where(Lead.stage == stage)
    result = await db.execute(q)
    return result.scalars().all()


@app.post("/leads", response_model=LeadOut)
@limiter.limit(READ_RATE_LIMIT)
async def create_lead(request: Request, body: LeadCreate, db: AsyncSession = Depends(get_db)):
    lead = Lead(**body.model_dump(), stage_entered_at=datetime.utcnow())
    db.add(lead)
    await db.flush()
    await _log(db, lead.id, "created", f"Lead created from {lead.source}")
    await db.commit()
    await db.refresh(lead)
    return lead


@app.get("/leads/{lead_id}", response_model=LeadOut)
@limiter.limit(READ_RATE_LIMIT)
async def get_lead(request: Request, lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead


@app.patch("/leads/{lead_id}", response_model=LeadOut)
@limiter.limit(READ_RATE_LIMIT)
async def update_lead(request: Request, lead_id: int, body: LeadUpdate, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")

    data = body.model_dump(exclude_none=True)

    # Track stage change
    if "stage" in data and data["stage"] != lead.stage:
        old_stage = lead.stage
        new_stage = data["stage"]
        data["stage_entered_at"] = datetime.utcnow()
        await _log(db, lead.id, "stage_change",
                   f"Moved from {old_stage.title()} → {new_stage.title()}")

    # Track notes update
    if "notes" in data and data["notes"] != lead.notes:
        await _log(db, lead.id, "note_added", "Notes updated")

    for k, v in data.items():
        setattr(lead, k, v)
    lead.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(lead)
    return lead


@app.delete("/leads/{lead_id}")
@limiter.limit(READ_RATE_LIMIT)
async def delete_lead(request: Request, lead_id: int, db: AsyncSession = Depends(get_db)):
    _block_if_public_demo()
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    await db.delete(lead)
    await db.commit()
    return {"ok": True}


# ── Lead Activities ────────────────────────────────────────

@app.get("/leads/{lead_id}/activities", response_model=list[LeadActivityOut])
@limiter.limit(READ_RATE_LIMIT)
async def get_activities(request: Request, lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LeadActivity)
        .where(LeadActivity.lead_id == lead_id)
        .order_by(LeadActivity.created_at.desc())
    )
    return result.scalars().all()


# ── AI Actions ─────────────────────────────────────────────

@app.post("/leads/{lead_id}/enrich", response_model=LeadOut)
@limiter.limit(AI_RATE_LIMIT)
async def enrich_lead(request: Request, lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    result = await ai.enrich_lead(lead.name, lead.company, lead.title, lead.industry)
    lead.ai_summary  = result.get("ai_summary")
    lead.icp_fit     = result.get("icp_fit")
    lead.enriched_at = datetime.utcnow()
    lead.updated_at  = datetime.utcnow()
    await _log(db, lead_id, "enriched",
               f"AI enriched: ICP {result.get('icp_fit', 'unknown').title()}")
    await db.commit()
    await db.refresh(lead)
    return lead


@app.post("/leads/{lead_id}/score", response_model=LeadOut)
@limiter.limit(AI_RATE_LIMIT)
async def score_lead(request: Request, lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    result = await ai.score_lead(
        lead.name, lead.company, lead.title, lead.industry,
        lead.deal_value, lead.stage, lead.ai_summary,
    )
    lead.score           = result.get("score")
    lead.score_reasoning = result.get("score_reasoning")
    lead.updated_at      = datetime.utcnow()
    await _log(db, lead_id, "scored",
               f"AI scored {result.get('score')}/100 — {result.get('score_reasoning', '')[:80]}")
    await db.commit()
    await db.refresh(lead)
    return lead


@app.post("/leads/{lead_id}/next-action", response_model=LeadOut)
@limiter.limit(AI_RATE_LIMIT)
async def next_action(request: Request, lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    action = await ai.generate_next_action(
        lead.name, lead.company, lead.stage, lead.score, lead.industry,
    )
    lead.next_action = action
    lead.updated_at  = datetime.utcnow()
    await _log(db, lead_id, "next_action", f"AI suggested: {action}")
    await db.commit()
    await db.refresh(lead)
    return lead


@app.post("/leads/{lead_id}/email", response_model=EmailOut)
@limiter.limit(AI_RATE_LIMIT)
async def generate_email(request: Request, lead_id: int, body: EmailGenRequest, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    result = await ai.generate_email(
        lead.name, lead.company, lead.title, lead.industry,
        lead.ai_summary, body.email_type,
    )
    email = Email(
        lead_id=lead_id,
        email_type=body.email_type,
        subject=result["subject"],
        body=result["body"],
    )
    db.add(email)
    await db.flush()
    await _log(db, lead_id, "email_sent",
               f"{body.email_type.replace('_', ' ').title()} email generated")
    await db.commit()
    await db.refresh(email)
    return email


@app.post("/leads/{lead_id}/email/{email_id}/open", response_model=EmailOut)
@limiter.limit(READ_RATE_LIMIT)
async def mark_email_opened(request: Request, lead_id: int, email_id: int, db: AsyncSession = Depends(get_db)):
    email = await db.get(Email, email_id)
    if not email or email.lead_id != lead_id:
        raise HTTPException(404, "Email not found")
    if not email.opened_at:
        email.opened_at = datetime.utcnow()
        await _log(db, lead_id, "email_opened", "Email marked as opened")
        await db.commit()
    await db.refresh(email)
    return email


# ── Analytics ──────────────────────────────────────────────

@app.get("/analytics/pipeline", response_model=PipelineAnalytics)
@limiter.limit(READ_RATE_LIMIT)
async def pipeline_analytics(request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead))
    leads  = result.scalars().all()

    total      = len(leads)
    total_value = sum(l.deal_value or 0 for l in leads)
    won        = sum(1 for l in leads if l.stage == "won")
    closed     = sum(1 for l in leads if l.stage in ("won", "lost"))
    win_rate   = round((won / closed * 100) if closed else 0, 1)
    valued     = [l.deal_value for l in leads if l.deal_value]
    avg_deal   = round(sum(valued) / len(valued), 2) if valued else 0

    stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
    by_stage       = {s: sum(1 for l in leads if l.stage == s) for s in stages}
    by_stage_value = {s: sum(l.deal_value or 0 for l in leads if l.stage == s) for s in stages}

    sources    = sorted({l.source for l in leads})
    by_source  = {s: sum(1 for l in leads if l.source == s) for s in sources}
    industries = sorted({l.industry for l in leads})
    by_industry = {i: sum(1 for l in leads if l.industry == i) for i in industries}

    return PipelineAnalytics(
        total_leads=total,
        total_value=total_value,
        win_rate=win_rate,
        avg_deal_size=avg_deal,
        by_stage=by_stage,
        by_stage_value=by_stage_value,
        by_source=by_source,
        by_industry=by_industry,
        high_icp=sum(1 for l in leads if l.icp_fit == "high"),
        scored_leads=sum(1 for l in leads if l.score is not None),
    )


@app.get("/analytics/report")
@limiter.limit(AI_RATE_LIMIT)
async def pipeline_report(request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead))
    leads  = result.scalars().all()
    stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
    analytics = {
        "total_leads": len(leads),
        "total_value": sum(l.deal_value or 0 for l in leads),
        "win_rate": round(
            sum(1 for l in leads if l.stage == "won") /
            max(1, sum(1 for l in leads if l.stage in ("won", "lost"))) * 100, 1
        ),
        "by_stage": {s: sum(1 for l in leads if l.stage == s) for s in stages},
        "avg_deal_size": round(
            sum(l.deal_value or 0 for l in leads if l.deal_value) /
            max(1, sum(1 for l in leads if l.deal_value)), 0
        ),
    }
    report_text = await ai.generate_pipeline_report(analytics)
    return {"report": report_text, "generated_at": datetime.utcnow().isoformat()}


@app.get("/analytics/forecast", response_model=ForecastData)
@limiter.limit(READ_RATE_LIMIT)
async def forecast(request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead))
    leads  = result.scalars().all()

    probs = {
        "new": 0.05, "qualified": 0.20, "proposal": 0.40,
        "negotiation": 0.70, "won": 1.0, "lost": 0.0,
    }

    weighted = sum((l.deal_value or 0) * probs.get(l.stage, 0) for l in leads)

    active_stages = ["new", "qualified", "proposal", "negotiation"]
    by_stage = [
        ForecastStage(
            stage=s,
            value=sum(l.deal_value or 0 for l in leads if l.stage == s),
            weighted=round(sum((l.deal_value or 0) * probs[s] for l in leads if l.stage == s), 0),
            probability=int(probs[s] * 100),
            count=sum(1 for l in leads if l.stage == s),
        )
        for s in active_stages
    ]

    lost_leads = [l for l in leads if l.stage == "lost" and l.lost_reason]
    lost_reasons = dict(Counter(l.lost_reason for l in lost_leads))
    if not lost_reasons:
        lost_reasons = {"Price": 2, "Competitor": 1, "No Budget": 1, "Ghosted": 1, "Timeline": 1}

    return ForecastData(
        weighted_pipeline=round(weighted, 0),
        expected_close_quarter=round(weighted * 0.75, 0),
        probability_by_stage=by_stage,
        lost_reasons=lost_reasons,
    )
