# AI Lead to Deal System — Implementation Flow

## What This System Does

Sales reps spend more time on admin than selling. Researching a lead, writing a first email, figuring out what to do next — that's 2 hours of prep for every new prospect. This system compresses it to seconds.

It takes raw leads, enriches them with AI intelligence, scores them on fit and urgency, writes personalised outreach emails for every stage of the sequence, and gives you a live pipeline view across all six deal stages. It's a complete sales ops co-pilot, not a CRM form.

---

## The Full Flow in Plain Steps

### Step 1 — Leads Come In

Leads enter the system with basic info: name, title, company, industry, email, deal value, and pipeline stage. The demo system ships with 12 realistic leads spread across all six stages so the pipeline looks full immediately.

Stages: **New → Qualified → Proposal → Negotiation → Won → Lost**

### Step 2 — AI Enrichment

Click **AI Enrich** on any lead to trigger the enrichment flow:

An animated modal walks through 4 enrichment steps:
1. Company research — analyses the company name, industry, and market position
2. Contact intelligence — reads the title and infers seniority, decision-making authority, typical pain points
3. ICP scoring — classifies as High / Medium / Low Ideal Customer Profile fit with a brief rationale
4. Summary generation — produces a 2-3 sentence sales-relevant profile

The result saves to the lead record. Enriched leads get noticeably better email quality because the AI has context to work with.

### Step 3 — AI Lead Scoring

Click **AI Score** to give the lead a numeric score (0–100):

| Scoring Dimension | Weight |
|---|---|
| Title seniority (C-suite vs. manager vs. individual) | 40% |
| Industry fit for your offering | 30% |
| Deal size (higher value = higher priority) | 20% |
| Pipeline stage momentum | 10% |

The score appears on every card in the pipeline and on the leads table. Colour-coded bars (green/amber/orange/red) make prioritisation instant.

### Step 4 — AI Next Action

Click **Next Action** on any lead to get one specific, actionable recommendation:

- For a new lead: "Schedule a discovery call to confirm budget authority before sending a proposal."
- For a stalled negotiation: "Send a case study from the FinTech sector — their main objection is industry relevance."
- For a won deal: "Initiate onboarding sequence and set a 30-day check-in."

It's never generic. The AI reads the lead's stage, score, enrichment data, and email history before recommending.

### Step 5 — Outreach Sequence

Click **Outreach** and select any lead to work through the 4-step email cadence:

| Day | Step | Purpose |
|---|---|---|
| Day 1 | Cold Outreach | First contact — personalised opening hook |
| Day 3 | Follow-Up | Light touch — adds a relevant insight |
| Day 7 | Value Add | Sends a case study or proof point |
| — | Proposal | Formal proposal email when ready to close |

Each step generates a full email using Claude — subject line, opening hook, body paragraphs, and close. Steps already generated show a green checkmark so you always know where you are in the sequence.

The typewriter animation on generation makes the AI writing process visible — it lands well in demos.

### Step 6 — Pipeline View (Kanban)

The Pipeline page shows all leads in a Kanban-style column view:

- Each column is a stage, with the stage colour header for quick scanning
- Cards show: lead name, company, AI score bar, ICP fit badge, deal value
- Click any card to open the detail panel: full profile, enrichment result, score breakdown, email history, and action buttons
- Move a lead to any stage from the detail panel

### Step 7 — Analytics Dashboard

Click Analytics for pipeline health at a glance:

- **Win rate** — percentage of qualified leads that converted to won
- **Total pipeline value** — sum of all open deal values
- **Average deal size** — across all stages
- **Stage distribution** — visual breakdown of how many leads are at each stage
- **Source breakdown** — where leads are coming from
- **AI Pipeline Report** — click to generate a full written analysis: executive summary, top opportunities by score, risks (stalled deals, no recent activity), and recommended actions

The report streams in line by line. It's one of the strongest demo moments.

---

## What Happens Automatically

| Event | What the System Does |
|---|---|
| Backend starts (first time) | Seeds 12 leads spread across all 6 stages |
| AI Enrich clicked | Saves ICP fit, AI summary to the lead record |
| AI Score clicked | Saves numeric score + reasoning to the lead record |
| Outreach email generated | Saves the generated email text with type and timestamp |
| Lead stage updated | Saves to DB, pipeline counts recalculate on next load |
| Generate Pipeline Report clicked | AI reads all lead data and streams a written analysis |

---

## Data Flow Diagram

```
Lead created (basic info: name, title, company, stage)
        ↓
AI Enrich → ICP fit + AI summary saved to lead
        ↓
AI Score → score (0-100) + reasoning saved to lead
        ↓
Next Action → specific recommendation per lead
        ↓
Outreach → Day 1 / Day 3 / Day 7 / Proposal emails generated + saved
        ↓
Pipeline Kanban ← reads all leads by stage
        ↓
Analytics Dashboard ← reads aggregate stats
        ↓
AI Pipeline Report ← reads everything, generates written analysis
```

---

## AI Features Summary

| Feature | Where | What It Does |
|---|---|---|
| **AI Enrich** | Leads / Pipeline detail | ICP classification + 2-3 sentence sales-relevant profile |
| **AI Score** | Leads / Pipeline detail | 0–100 score with written reasoning |
| **Next Action** | Pipeline detail | One specific, stage-aware recommended action |
| **Generate Email** | Outreach page | Full personalised email for selected sequence step |
| **Pipeline Report** | Analytics page | Full written pipeline analysis, streams line by line |

All AI features work in demo mode with no API key. Switch to live Claude by setting `ANTHROPIC_API_KEY` in `.env` and `DEMO_MODE=false`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) + async SQLAlchemy |
| Database | SQLite via aiosqlite (auto-created) |
| AI Engine | Anthropic Claude API (demo mode works without key) |
| Frontend | Next.js 15 + React 19 + TypeScript |
| Styling | Tailwind CSS — white/orange/black brand theme |
| Package manager | uv (Python) + npm (Node) |

---

## Running the Project

```bash
# 1. Backend (port 8000)
cd AI-Lead-to-Deal-System/backend

pip install uv          # if you don't have it
uv venv
uv sync

# Windows
.venv\Scripts\uvicorn main:app --port 8000 --reload

# Mac/Linux
.venv/bin/uvicorn main:app --port 8000 --reload
```

The backend auto-seeds 12 demo leads on first start. Delete `leads.db` and restart to re-seed.

```bash
# 2. Frontend (port 3000)
cd AI-Lead-to-Deal-System/frontend

npm install
npm run dev -- -p 3000
```

Open **http://localhost:3000** — you land straight on the Pipeline page with all 12 leads loaded.

---

## Demo Walkthrough (5 minutes)

**1. Open Pipeline**
Show the Kanban with 12 leads spread across all stages. Point out the score bars and ICP badges on the cards. The pipeline looks full and real from second one.

**2. Click a New lead** (no enrichment yet)
Daniel Park or Rajiv Menon — no score, no ICP badge. Hit **AI Enrich** and watch the animated modal work through the 4 enrichment steps, then reveal the ICP result. Then hit **AI Score** on the same lead.

**3. Switch to Leads table**
Show the batch operations panel at the top. Click **Enrich New** and watch the progress bar move through each unenriched lead. This shows scale — the AI works through every lead automatically.

**4. Open Outreach**
Select Marcus Williams (the FinTech CTO in the Won stage — high-value, well-enriched). Show the Day 1 → Day 3 → Day 7 → Proposal cadence. Generate the Cold Outreach email and let the typewriter animation play out. The personalisation (company name, title, industry, specific pain points) makes it feel real.

**5. Open Analytics**
Hit **Generate Pipeline Report** and show the AI analysis streaming in. Point out: it's referencing specific leads by name, flagging stalled deals, citing win rates. It reads like a real sales manager's report.

---

## Project Structure

```
AI-Lead-to-Deal-System/
├── backend/
│   ├── main.py          # FastAPI app, all endpoints, demo seed data
│   ├── ai.py            # Claude API calls + demo fallbacks
│   ├── models.py        # SQLAlchemy models (Lead, Email)
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── database.py      # Async SQLite engine and session setup
│   └── pyproject.toml   # Python dependencies (uv)
│
└── frontend/
    └── src/
        ├── app/
        │   ├── pipeline/    # Kanban board — 6-stage pipeline view
        │   ├── leads/       # Searchable table + batch AI operations
        │   ├── outreach/    # 4-step email sequence generator
        │   └── analytics/   # Pipeline health dashboard + AI report
        ├── components/
        │   ├── layout/
        │   │   └── Navbar.tsx      # White sidebar, CT logo, orange active state
        │   └── ui/
        │       └── EnrichmentModal.tsx  # Animated 4-step enrichment flow
        ├── assets/
        │   └── ct logo.png         # CT brand logo (used by Navbar)
        ├── lib/
        │   ├── api.ts       # All backend API calls
        │   └── utils.ts     # Score/ICP/stage badge helpers, STAGES constant
        └── types/
            └── index.ts     # TypeScript types (Lead, Email, PipelineAnalytics)
```

---

## Ports

| Service | Port |
|---|---|
| Frontend | 3000 |
| Backend API | 8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## Resetting Demo Data

```bash
# Stop the backend, then:
del backend\leads.db      # Windows
rm backend/leads.db       # Mac/Linux

# Restart — re-seeds 12 leads automatically
```

---

## Notes for the Developer

- **Email quality improves with enrichment.** The generate email endpoint reads `ai_summary` from the lead — so enriched leads get far better personalisation. Worth demonstrating: generate an email on an unenriched lead first, then enrich and regenerate. The difference is visible.
- **The `EnrichmentModal` component is self-contained.** It fires the API on mount, plays the step animation, and closes when done. Drop it into any other project that needs an animated AI processing flow.
- **Stage colours are semantic, not brand.** The pipeline uses different colours per stage (slate/green/violet/amber/emerald) intentionally — it helps reps scan stages fast. The brand orange is reserved for the sidebar active state and primary actions.
- **Batch operations** (`/leads/enrich-new`, `/leads/score-all`) exist on the backend. They process sequentially and return progress events — the frontend polls until done.
- **No auth** — demo system. Add authentication before any production use.
- **All AI logic lives in `ai.py`** — clean separation from the route layer. To swap models or adjust scoring weights, only touch `ai.py`.
