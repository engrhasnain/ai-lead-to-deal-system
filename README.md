# AI Lead-to-Deal System

An end-to-end AI-powered sales pipeline — from raw lead to closed deal. Built with FastAPI and Next.js, powered by Claude AI.

---

## What This Is

This system replaces the manual grind of sales ops. It takes your leads, enriches them with AI intelligence, scores them on fit and urgency, generates personalised outreach emails, and gives you a live pipeline view — all in one place.

Think of it as a sales team's unfair advantage. The kind of work that used to take a rep 2 hours per lead now happens in seconds.

It's built as a demo system, so it comes pre-loaded with 12 realistic leads across all pipeline stages — you can show it working immediately without any setup beyond running two commands.

---

## What It Does

**Pipeline (Kanban Board)**
The heart of the system. Six stages: New → Qualified → Proposal → Negotiation → Won → Lost. Drag leads isn't wired yet (by design — focus is on AI actions), but you can move any lead to any stage from the detail panel. Each card shows the AI score, ICP fit badge, and deal value at a glance.

**Leads Table**
Full searchable, filterable table of every lead. Click any row to open a detail panel with the full lead profile — enrichment data, score reasoning, generated emails, next action. Batch operations let you score every unscored lead or enrich all new leads in one click, with a live progress bar.

**Outreach Sequence**
Pick a lead, then work through the Day 1 → Day 3 → Day 7 → Proposal cadence. Each step generates a fully personalised email using Claude — subject line, opening hook, body, and close. Steps you've already generated show a green checkmark so you always know where you are in the sequence.

**Analytics Dashboard**
Pipeline health at a glance: win rate, total pipeline value, average deal size, stage distribution, and source breakdown. The AI report button generates a written pipeline analysis with executive summary, top opportunities, and recommended actions.

---

## AI Features

All four AI actions work in two modes — live Claude API or demo fallback (see below).

| Action | What It Does |
|---|---|
| **AI Enrich** | Analyses the lead's company, title and industry. Returns an ICP fit rating (High / Medium / Low) and a 2-3 sentence sales-relevant summary. |
| **AI Score** | Scores the lead 0–100 based on title seniority (40%), industry fit (30%), deal size (20%), and pipeline stage (10%). Includes written reasoning. |
| **Next Action** | Generates one specific, actionable next step tailored to the lead's stage and score. No generic advice — it tells you exactly what to do. |
| **Generate Email** | Writes a full personalised email for the selected sequence step. Uses the lead's enrichment data to customise the opening, pain points, and CTA. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy 2.0 async, aiosqlite |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Database | SQLite (auto-created on first run) |
| Styling | Tailwind CSS — white/orange/black CT brand theme |

---

## Getting Started

You need Python 3.11+ and Node.js 18+ installed. That's it.

### 1. Backend

```bash
cd AI-Lead-to-Deal-System/backend

# Install uv if you don't have it
pip install uv

# Create virtual environment and install dependencies
uv venv
uv pip install -r pyproject.toml   # or: uv sync

# Optional — only needed for live AI (demo mode works without it)
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run the server
.venv/Scripts/uvicorn main:app --port 8000 --reload   # Windows
# or
.venv/bin/uvicorn main:app --port 8000 --reload        # Mac/Linux
```

The first time it starts, it automatically creates the database and seeds 12 demo leads. You'll see confirmation in the terminal. Port: **8000**.

### 2. Frontend

```bash
cd AI-Lead-to-Deal-System/frontend

npm install
npm run dev
```

Open **http://localhost:3000** — you should land straight on the Pipeline page with all 12 leads loaded.

---

## Demo Mode vs Live AI

The system runs in **demo mode by default** — no API key needed, everything works immediately.

In demo mode, AI actions return smart pre-built responses that look and feel realistic. The enrichment, scoring, emails, and reports are all sensible and demo-ready — they're not placeholders.

To switch to **live Claude AI**, add your Anthropic API key to `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
DEMO_MODE=false
```

Restart the backend. That's it — every AI action now calls Claude in real time.

---

## Running a Demo

Here's a suggested walkthrough order that tells a clear story:

1. **Open Pipeline** — show the Kanban with 12 leads spread across all stages. Point out the score bars and ICP badges on the cards.

2. **Click a New lead** (Daniel Park or Rajiv Menon) — they have no enrichment yet. Hit **AI Enrich** and watch the animated modal work through the 4 enrichment steps, then reveal the ICP result.

3. **Hit AI Score** on the same lead — show the score appear with reasoning.

4. **Switch to Leads table** — show the batch operations. Click **Enrich New** and watch the progress bar move through each lead.

5. **Open Outreach** — select Marcus Williams (the FinTech CTO). Show the Day 1 → Day 3 → Day 7 cadence. Generate a Cold Outreach email and let the typewriter animation play out.

6. **Open Analytics** — hit Generate Pipeline Report and show the AI analysis streaming in line by line.

The whole walkthrough takes about 5 minutes and covers every major feature.

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
        │   ├── pipeline/   # Kanban board
        │   ├── leads/      # Table view with batch ops
        │   ├── outreach/   # Email sequence generator
        │   └── analytics/  # Dashboard and AI report
        ├── components/
        │   ├── layout/
        │   │   └── Navbar.tsx            # White sidebar, CT logo, orange active state
        │   └── ui/
        │       └── EnrichmentModal.tsx   # Animated 4-step enrichment flow
        ├── assets/
        │   └── ct logo.png              # CT brand logo (used by Navbar)
        ├── lib/
        │   ├── api.ts      # All backend API calls
        │   └── utils.ts    # Formatters, badge helpers, STAGES constant
        └── types/
            └── index.ts    # TypeScript types for all data models
```

---

## Ports & Configuration

| Service | Port |
|---|---|
| Frontend | 3000 |
| Backend API | 8000 |
| API docs (Swagger) | http://localhost:8000/docs |

The backend Swagger docs at `/docs` let you call any endpoint manually — useful for testing or showing the API layer during a technical demo.

---

## Resetting the Demo Data

The database file (`backend/leads.db`) is auto-created and seeded on first run. To start fresh:

```bash
# While the backend is stopped:
del backend\leads.db      # Windows
rm backend/leads.db       # Mac/Linux

# Restart the backend — it re-seeds automatically
```

---

## Notes for Whoever Picks This Up

A few things worth knowing before you dig in:

- The demo seed data is deliberately spread across all 6 pipeline stages so the Kanban looks full and realistic from the first second.
- The AI scoring weights (title seniority 40%, industry 30%, deal size 20%, stage 10%) are hard-coded in `ai.py` — easy to adjust if the client wants different weights.
- Email generation uses the lead's `ai_summary` field as context — so leads that have been enriched first get noticeably better email quality than unenriched ones. Worth mentioning in a demo.
- The `EnrichmentModal` component in `src/components/ui/` is self-contained and reusable — it fires the API call on mount and plays the step animation independently, so you can drop it into any other project.
- There's no authentication — this is a demo system. If this ever goes to production, that's the first thing to add.

Good luck with it.
