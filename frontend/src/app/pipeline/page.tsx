"use client";

import { useEffect, useState } from "react";
import {
  Loader2, RefreshCw, UserPlus, Brain, Star, Mail,
  ChevronLeft, ChevronRight, Building2,
  DollarSign, ArrowRight, AlertTriangle, Search, X,
} from "lucide-react";
import toast from "react-hot-toast";

import { leadsApi } from "@/lib/api";
import {
  formatCurrency, timeAgo, capitalize, scoreColor, scoreBarColor,
  icpBadge, stageBadge, stageBorderColor, STAGES,
} from "@/lib/utils";
import type { Lead, LeadStage } from "@/types";
import EnrichmentModal from "@/components/ui/EnrichmentModal";

// ── Animated score bar ────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${scoreBarColor(score)}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

// ── Add Lead modal ────────────────────────────────────────
function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: (l: Lead) => void }) {
  const [form, setForm] = useState({
    name: "", email: "", company: "", title: "",
    industry: "SaaS", source: "manual", deal_value: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email || !form.company || !form.title) {
      toast.error("Name, email, company and title are required");
      return;
    }
    setSaving(true);
    try {
      const lead = await leadsApi.create({
        ...form,
        deal_value: form.deal_value ? parseFloat(form.deal_value) : undefined,
      });
      toast.success("Lead added");
      onAdded(lead);
      onClose();
    } catch {
      toast.error("Failed to add lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
          <h2 className="text-base font-black text-zinc-900">Add New Lead</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Name *</label>
              <input className="input w-full" placeholder="Sarah Chen" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Email *</label>
              <input className="input w-full" type="email" placeholder="sarah@acme.co" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Company *</label>
              <input className="input w-full" placeholder="Acme Corp" value={form.company} onChange={e => set("company", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Title *</label>
              <input className="input w-full" placeholder="VP of Sales" value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wide block mb-1">Industry</label>
              <select className="input w-full" value={form.industry} onChange={e => set("industry", e.target.value)}>
                {["SaaS","FinTech","Healthcare","E-Commerce","Logistics","Technology","Construction Tech","Media & Advertising","Manufacturing","Other"].map(i =>
                  <option key={i}>{i}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Source</label>
              <select className="input w-full" value={form.source} onChange={e => set("source", e.target.value)}>
                {["LinkedIn","Referral","Website","Conference","Cold Outreach","manual"].map(s =>
                  <option key={s} value={s}>{capitalize(s)}</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Deal Value (USD)</label>
            <input className="input w-full" type="number" placeholder="25000" value={form.deal_value} onChange={e => set("deal_value", e.target.value)} />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary py-2">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary py-2">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><UserPlus className="w-3.5 h-3.5" /> Add Lead</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lost Reason Modal ─────────────────────────────────────
function LostReasonModal({ onConfirm, onCancel }: {
  onConfirm: (reason: string) => void;
  onCancel:  () => void;
}) {
  const [reason, setReason] = useState("Price");
  const REASONS = ["Price", "Competitor", "No Budget", "No Authority", "Timeline", "Not a Fit", "Ghosted"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
          <h2 className="text-base font-black text-zinc-900">Mark as Lost</h2>
          <p className="text-xs text-zinc-400 mt-1">Select the reason this deal was lost to improve analytics.</p>
        </div>
        <div className="px-6 py-5 space-y-2">
          {REASONS.map(r => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="lost_reason" value={r} checked={reason === r}
                onChange={() => setReason(r)} className="accent-orange-500" />
              <span className="text-sm text-zinc-700">{r}</span>
            </label>
          ))}
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary py-2">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="btn-primary py-2 bg-zinc-800 hover:bg-zinc-900">
            Confirm Lost
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lead card ─────────────────────────────────────────────
function LeadCard({
  lead,
  onAction,
  onStageChange,
  stageIndex,
}: {
  lead: Lead;
  onAction: (id: number, action: "enrich" | "score" | "nextAction" | "email") => void;
  onStageChange: (id: number, dir: -1 | 1) => void;
  stageIndex: number;
}) {
  const [working, setWorking] = useState<string | null>(null);

  const act = async (a: "enrich" | "score" | "nextAction" | "email") => {
    setWorking(a);
    try { await onAction(lead.id, a); }
    finally { setWorking(null); }
  };

  const isFirst = stageIndex === 0;
  const isLast  = stageIndex === STAGES.length - 1;

  return (
    <div className={`bg-white rounded-xl border border-zinc-200 border-l-[3px] ${stageBorderColor(lead.stage)} shadow-sm hover:shadow-md transition-shadow card-in`}>
      <div className="p-3.5 space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-zinc-900 truncate leading-tight">{lead.name}</p>
              {lead.is_stuck && (
                <span title="Stuck > 14 days" className="shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 truncate">{lead.title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {lead.is_stuck && (
              <span className="badge text-[9px] bg-amber-50 text-amber-700 border-amber-200">Stuck</span>
            )}
            {lead.source && (
              <span className="badge text-[10px] bg-zinc-50 text-zinc-500 border-zinc-200">{capitalize(lead.source)}</span>
            )}
          </div>
        </div>

        {/* Company + industry */}
        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.company}</span>
          <span className="text-zinc-300 mx-0.5">·</span>
          <span className="shrink-0 text-zinc-400">{lead.industry}</span>
        </div>

        {/* Score bar */}
        {lead.score != null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-medium">AI Score</span>
              <span className={`badge text-[10px] border ${scoreColor(lead.score)}`}>{lead.score}</span>
            </div>
            <ScoreBar score={lead.score} />
          </div>
        )}

        {/* ICP + deal value */}
        <div className="flex items-center gap-2 flex-wrap">
          {lead.icp_fit && (
            <span className={`badge text-[10px] border ${icpBadge(lead.icp_fit)}`}>
              ICP {capitalize(lead.icp_fit)}
            </span>
          )}
          {lead.deal_value != null && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-zinc-700">
              <DollarSign className="w-3 h-3 text-zinc-400" />
              {formatCurrency(lead.deal_value, lead.currency)}
            </span>
          )}
        </div>

        {/* Next action */}
        {lead.next_action && (
          <div className="flex items-start gap-1.5 bg-orange-50 rounded-lg px-2.5 py-1.5">
            <ArrowRight className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-orange-700 leading-snug">{lead.next_action}</p>
          </div>
        )}

        {/* Time */}
        <p className="text-[10px] text-zinc-400">{timeAgo(lead.created_at)}</p>

        {/* AI action buttons */}
        <div className="flex items-center gap-1 pt-1 border-t border-zinc-100">
          <button onClick={() => act("enrich")} disabled={!!working} title="AI Enrich"
            className="btn-ghost flex-1 justify-center py-1.5 text-[10px]">
            {working === "enrich" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
            <span>Enrich</span>
          </button>
          <button onClick={() => act("score")} disabled={!!working} title="AI Score"
            className="btn-ghost flex-1 justify-center py-1.5 text-[10px]">
            {working === "score" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
            <span>Score</span>
          </button>
          <button onClick={() => act("email")} disabled={!!working} title="Generate Email"
            className="btn-ghost flex-1 justify-center py-1.5 text-[10px]">
            {working === "email" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            <span>Email</span>
          </button>
        </div>

        {/* Stage move */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStageChange(lead.id, -1)}
            disabled={isFirst}
            className="btn-ghost flex-1 justify-center py-1 text-[10px] disabled:opacity-25"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
          <button
            onClick={() => onStageChange(lead.id, 1)}
            disabled={isLast}
            className="btn-ghost flex-1 justify-center py-1 text-[10px] disabled:opacity-25"
          >
            Advance <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────
function KanbanColumn({
  stage, cards, totalValue, onAction, onStageChange, stageIndex,
}: {
  stage: (typeof STAGES)[0];
  cards: Lead[];
  totalValue: number;
  onAction: (id: number, action: "enrich" | "score" | "nextAction" | "email") => void;
  onStageChange: (id: number, dir: -1 | 1) => void;
  stageIndex: number;
}) {
  return (
    <div className="kanban-column">
      <div className={`flex items-center justify-between px-3 py-2.5 mb-2.5 rounded-xl border bg-white ${stage.headerCls}`}>
        <div>
          <p className="text-xs font-black">{stage.label}</p>
          {totalValue > 0 && (
            <p className="text-[10px] font-semibold opacity-70">{formatCurrency(totalValue)}</p>
          )}
        </div>
        <span className="w-6 h-6 rounded-full bg-current/10 text-current flex items-center justify-center text-xs font-black">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[60px] pr-0.5">
        {cards.length === 0 && (
          <div className="h-16 border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center">
            <p className="text-[11px] text-zinc-300">No leads</p>
          </div>
        )}
        {cards.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onAction={onAction}
            onStageChange={onStageChange}
            stageIndex={stageIndex}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function PipelinePage() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [search, setSearch]       = useState("");
  const [lostTarget, setLostTarget] = useState<number | null>(null);
  const [enrichTarget, setEnrichTarget] = useState<Lead | null>(null);

  const load = async () => {
    setLoading(true);
    try { setLeads(await leadsApi.list()); }
    catch { toast.error("Failed to load pipeline"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = search.trim()
    ? leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.company.toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const byStage = (stage: string) => filtered.filter(l => l.stage === stage);
  const stageValue = (stage: string) =>
    filtered.filter(l => l.stage === stage).reduce((s, l) => s + (l.deal_value ?? 0), 0);

  const handleAction = async (id: number, action: "enrich" | "score" | "nextAction" | "email") => {
    // Enrich uses the step-by-step modal instead of a spinner
    if (action === "enrich") {
      const lead = leads.find(l => l.id === id);
      if (lead) setEnrichTarget(lead);
      return;
    }

    const labels: Record<string, string> = {
      score: "Scoring lead…", nextAction: "Generating next action…", email: "Writing outreach email…",
    };
    const t = toast.loading(labels[action]);
    try {
      let updated: Lead;
      if (action === "score") updated = await leadsApi.score(id);
      else if (action === "email") {
        await leadsApi.email(id, "cold");
        updated = await leadsApi.get(id);
        toast.dismiss(t);
        toast.success("Cold email generated — check Outreach page");
        setLeads(prev => prev.map(l => l.id === id ? updated : l));
        return;
      }
      else updated = await leadsApi.nextAction(id);
      toast.dismiss(t);
      toast.success(action === "score" ? `Score: ${updated.score}/100` : "Next action updated");
      setLeads(prev => prev.map(l => l.id === id ? updated : l));
    } catch {
      toast.dismiss(t);
      toast.error("Action failed");
    }
  };

  const handleStageChange = async (id: number, dir: -1 | 1, lostReason?: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const idx = STAGES.findIndex(s => s.key === lead.stage);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= STAGES.length) return;
    const newStage = STAGES[newIdx].key as LeadStage;
    // Prompt for lost reason
    if (newStage === "lost" && !lostReason) {
      setLostTarget(id);
      return;
    }
    try {
      const body: Partial<Lead> = { stage: newStage };
      if (newStage === "lost" && lostReason) body.lost_reason = lostReason;
      const updated = await leadsApi.update(id, body);
      setLeads(prev => prev.map(l => l.id === id ? updated : l));
      toast.success(`Moved to ${STAGES[newIdx].label}`);
    } catch {
      toast.error("Failed to move lead");
    }
  };

  const totalPipeline = leads.reduce((s, l) => s + (l.deal_value ?? 0), 0);
  const wonValue = leads.filter(l => l.stage === "won").reduce((s, l) => s + (l.deal_value ?? 0), 0);

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col overflow-hidden bg-brand-surface/30">
      <div className="flex flex-1 flex-col min-h-0 w-full max-w-[1600px] mx-auto border-x border-brand-border bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-brand-charcoal tracking-tight">Sales Pipeline</h1>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-orange bg-brand-orange-50 border border-brand-orange/25 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                AI active
              </div>
            </div>
            <p className="text-xs text-brand-muted mt-0.5 truncate sm:whitespace-normal">
              {leads.length} leads · {formatCurrency(totalPipeline)} pipeline · {formatCurrency(wonValue)} closed
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={load} disabled={loading} className="btn-secondary py-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary py-2">
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-brand-border bg-white shrink-0">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          <input
            className="input w-full pl-8 text-xs py-1.5"
            placeholder="Filter by name or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600" />
            </button>
          )}
        </div>
      </div>

      {/* AI monitor strip */}
      <div className="px-4 sm:px-6 py-2 bg-brand-orange-50 border-b border-brand-orange-100 flex items-center gap-2 text-[11px] text-brand-orange-dark shrink-0 overflow-hidden">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute h-full w-full rounded-full bg-brand-orange-light opacity-75" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-brand-orange" />
        </span>
        <span className="truncate font-medium sm:whitespace-normal">AI pipeline engine active · lead scoring model claude-sonnet-4-6 · enrichment and next-action suggestions on demand</span>
      </div>

      {/* Kanban board */}
      {loading
        ? <div className="flex-1 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-brand-orange animate-spin" />
            <p className="text-sm text-brand-muted">Loading pipeline…</p>
          </div>
        : <div className="kanban-scroll bg-brand-surface/20">
            <div className="flex gap-3 sm:gap-4 h-full min-w-min pb-2">
              {STAGES.map((stage, stageIndex) => (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  cards={byStage(stage.key)}
                  totalValue={stageValue(stage.key)}
                  onAction={handleAction}
                  onStageChange={handleStageChange}
                  stageIndex={stageIndex}
                />
              ))}
            </div>
          </div>
      }

      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onAdded={lead => setLeads(prev => [lead, ...prev])}
        />
      )}

      {lostTarget !== null && (
        <LostReasonModal
          onConfirm={async (reason) => {
            const id = lostTarget;
            setLostTarget(null);
            await handleStageChange(id, 1, reason);
          }}
          onCancel={() => setLostTarget(null)}
        />
      )}

      {enrichTarget && (
        <EnrichmentModal
          lead={enrichTarget}
          onComplete={updated => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setEnrichTarget(null);
            toast.success(`Enriched · ICP: ${updated.icp_fit}`);
          }}
          onError={() => {
            setEnrichTarget(null);
            toast.error("Enrichment failed");
          }}
        />
      )}
      </div>
    </div>
  );
}
