"use client";

import { useEffect, useState } from "react";
import {
  Loader2, RefreshCw, Search, Brain, Star, Mail, Trash2,
  ChevronRight, X, ArrowRight, Sparkles, FileText, Clock,
  GitBranch, CheckCircle2, Zap, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

import { leadsApi } from "@/lib/api";
import {
  formatCurrency, timeAgo, capitalize, scoreColor, scoreBarColor,
  icpBadge, stageBadge, STAGES,
} from "@/lib/utils";
import type { Lead, LeadActivity } from "@/types";
import EnrichmentModal from "@/components/ui/EnrichmentModal";

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  enriched:     <Brain className="w-3 h-3 text-orange-500" />,
  scored:       <Star className="w-3 h-3 text-amber-500" />,
  email_sent:   <Mail className="w-3 h-3 text-blue-500" />,
  email_opened: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
  stage_change: <GitBranch className="w-3 h-3 text-zinc-500" />,
  note_added:   <Zap className="w-3 h-3 text-zinc-500" />,
  created:      <CheckCircle2 className="w-3 h-3 text-zinc-400" />,
  next_action:  <ArrowRight className="w-3 h-3 text-orange-400" />,
};

// ── Animated score bar ─────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(score), 60);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(score)}`} style={{ width: `${w}%` }} />
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────
function DetailPanel({
  lead, onClose, onUpdate, onEnrichClick,
}: {
  lead: Lead; onClose: () => void; onUpdate: (l: Lead) => void;
  onEnrichClick: (lead: Lead) => void;
}) {
  const [working, setWorking] = useState<string | null>(null);
  const [notes, setNotes]     = useState(lead.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [activities, setActivities]   = useState<LeadActivity[]>(lead.activities ?? []);
  const [loadingActs, setLoadingActs] = useState(false);

  useEffect(() => {
    setNotes(lead.notes ?? "");
    setActivities(lead.activities ?? []);
  }, [lead.id]);

  const loadActivities = async () => {
    setLoadingActs(true);
    try { setActivities(await leadsApi.activities(lead.id)); }
    catch { /* silent */ }
    finally { setLoadingActs(false); }
  };

  useEffect(() => { loadActivities(); }, [lead.id]);

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const updated = await leadsApi.update(lead.id, { notes });
      onUpdate(updated);
      toast.success("Notes saved");
    } catch { toast.error("Failed to save notes"); }
    finally { setSavingNotes(false); }
  };

  const act = async (action: "score" | "nextAction" | "email") => {
    setWorking(action);
    const t = toast.loading(action === "score" ? "Scoring…" : action === "email" ? "Writing email…" : "Thinking…");
    try {
      let updated: Lead;
      if (action === "score") updated = await leadsApi.score(lead.id);
      else if (action === "email") { await leadsApi.email(lead.id, "cold"); updated = await leadsApi.get(lead.id); }
      else updated = await leadsApi.nextAction(lead.id);
      toast.dismiss(t);
      toast.success(action === "score" ? `Score: ${updated.score}/100` : action === "email" ? "Email generated" : "Next action updated");
      onUpdate(updated);
    } catch {
      toast.dismiss(t);
      toast.error("Action failed");
    } finally {
      setWorking(null);
    }
  };

  const stageMove = async (newStage: string) => {
    try {
      const updated = await leadsApi.update(lead.id, { stage: newStage as Lead["stage"] });
      toast.success(`Moved to ${capitalize(newStage)}`);
      onUpdate(updated);
    } catch { toast.error("Failed to update stage"); }
  };

  return (
    <div className="w-full h-full border-l border-zinc-200 bg-white flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between shrink-0">
        <div>
          <p className="font-black text-zinc-900">{lead.name}</p>
          <p className="text-xs text-zinc-500">{lead.title} · {lead.company}</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">

        {/* Stage selector */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Stage</p>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map(s => (
              <button key={s.key} onClick={() => stageMove(s.key)}
                className={`badge text-[10px] border cursor-pointer hover:opacity-80 transition-opacity ${
                  lead.stage === s.key ? stageBadge(s.key) + " ring-1 ring-offset-1 ring-current" : stageBadge(s.key)
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Score */}
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Lead Score</p>
            {lead.score != null && <span className={`badge text-[11px] border ${scoreColor(lead.score)}`}>{lead.score}/100</span>}
          </div>
          {lead.score != null
            ? <ScoreBar score={lead.score} />
            : <p className="text-xs text-zinc-400">Not scored yet</p>
          }
          {lead.score_reasoning && (
            <p className="text-xs text-zinc-500 leading-relaxed">{lead.score_reasoning}</p>
          )}
        </div>

        {/* ICP + enrichment */}
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">ICP Fit</p>
            {lead.icp_fit && <span className={`badge text-[11px] border ${icpBadge(lead.icp_fit)}`}>{capitalize(lead.icp_fit)}</span>}
          </div>
          {lead.ai_summary
            ? <p className="text-xs text-zinc-600 leading-relaxed">{lead.ai_summary}</p>
            : <p className="text-xs text-zinc-400">Not enriched yet — click Enrich below</p>
          }
          {lead.enriched_at && (
            <p className="text-[10px] text-zinc-400">Enriched {timeAgo(lead.enriched_at)}</p>
          )}
        </div>

        {/* Deal info */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          {[
            { label: "Deal Value", value: lead.deal_value ? formatCurrency(lead.deal_value, lead.currency) : "—" },
            { label: "Industry",   value: lead.industry },
            { label: "Source",     value: capitalize(lead.source) },
            { label: "Added",      value: timeAgo(lead.created_at) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
              <p className="text-xs text-zinc-700 font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Next action */}
        {lead.next_action && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Next Action</p>
            <div className="flex items-start gap-2 bg-orange-50 rounded-xl p-3">
              <ArrowRight className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-xs text-orange-800 font-medium leading-snug">{lead.next_action}</p>
            </div>
          </div>
        )}

        {/* Lost reason */}
        {lead.stage === "lost" && lead.lost_reason && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Lost Reason</p>
            <span className="badge border bg-zinc-100 text-zinc-600 border-zinc-200">
              <AlertTriangle className="w-3 h-3" /> {lead.lost_reason}
            </span>
          </div>
        )}

        {/* Generated emails */}
        {lead.emails.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Generated Emails ({lead.emails.length})</p>
            <div className="space-y-2">
              {lead.emails.map(e => (
                <div key={e.id} className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="badge text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                      {capitalize(e.email_type.replace("_", " "))}
                    </span>
                    <span className="text-[10px] text-zinc-400">{timeAgo(e.generated_at)}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-700 truncate">{e.subject}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Notes</p>
          </div>
          <textarea
            className="input w-full text-xs resize-none"
            rows={4}
            placeholder="Add internal notes about this lead…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          {notes !== (lead.notes ?? "") && (
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="btn-primary mt-2 py-1.5 text-xs w-full justify-center"
            >
              {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save Notes
            </button>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Activity Timeline</p>
            {loadingActs && <Loader2 className="w-3 h-3 text-zinc-300 animate-spin ml-auto" />}
          </div>
          {activities.length === 0 && !loadingActs ? (
            <p className="text-xs text-zinc-300">No activity recorded yet</p>
          ) : (
            <div className="space-y-2.5">
              {activities.map(act => (
                <div key={act.id} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                    {ACTIVITY_ICONS[act.event_type] ?? <Zap className="w-3 h-3 text-zinc-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-700 leading-snug">{act.description}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{timeAgo(act.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI action bar */}
      <div className="px-4 py-3 border-t border-zinc-100 grid grid-cols-2 gap-2 shrink-0">
        <button onClick={() => onEnrichClick(lead)} disabled={!!working} className="btn-secondary py-2 text-xs justify-center">
          <Brain className="w-3.5 h-3.5" />
          AI Enrich
        </button>
        <button onClick={() => act("score")} disabled={!!working} className="btn-secondary py-2 text-xs justify-center">
          {working === "score" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
          AI Score
        </button>
        <button onClick={() => act("nextAction")} disabled={!!working} className="btn-secondary py-2 text-xs justify-center">
          {working === "nextAction" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Next Action
        </button>
        <button onClick={() => act("email")} disabled={!!working} className="btn-primary py-2 text-xs justify-center">
          {working === "email" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          Write Email
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState("");
  const [stageFilter, setStage]     = useState("");
  const [icpFilter, setICP]         = useState("");
  const [selected, setSelected]     = useState<Lead | null>(null);
  const [enrichTarget, setEnrich]   = useState<Lead | null>(null);
  const [batch, setBatch]           = useState<{ action: string; done: number; total: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try { setLeads(await leadsApi.list()); }
    catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = leads.filter(l => {
    const q = query.toLowerCase();
    const matchQ = !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) ||
                   l.email.toLowerCase().includes(q) || l.industry.toLowerCase().includes(q);
    const matchS = !stageFilter || l.stage === stageFilter;
    const matchI = !icpFilter || l.icp_fit === icpFilter;
    return matchQ && matchS && matchI;
  });

  const update = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const deleteLead = async (id: number) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await leadsApi.remove(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Lead deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const batchScore = async () => {
    const targets = leads.filter(l => l.score == null);
    if (!targets.length) { toast("All leads already scored"); return; }
    setBatch({ action: "Scoring", done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      try {
        const updated = await leadsApi.score(targets[i].id);
        setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      } catch { /* skip failed */ }
      setBatch({ action: "Scoring", done: i + 1, total: targets.length });
    }
    setBatch(null);
    toast.success(`Scored ${targets.length} leads`);
  };

  const batchEnrich = async () => {
    const targets = leads.filter(l => !l.icp_fit && l.stage === "new");
    if (!targets.length) { toast("No new un-enriched leads"); return; }
    setBatch({ action: "Enriching", done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      try {
        const updated = await leadsApi.enrich(targets[i].id);
        setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      } catch { /* skip failed */ }
      setBatch({ action: "Enriching", done: i + 1, total: targets.length });
    }
    setBatch(null);
    toast.success(`Enriched ${targets.length} leads`);
  };

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col overflow-hidden bg-brand-surface/30">
      <div className="flex flex-1 flex-col min-h-0 w-full max-w-[1600px] mx-auto border-x border-brand-border bg-white shadow-sm">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-brand-charcoal">Lead Management</h1>
            <p className="text-xs text-brand-muted mt-0.5">{leads.length} leads · {filtered.length} shown</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button onClick={batchScore} disabled={!!batch || loading} className="btn-secondary py-2 text-xs flex-1 sm:flex-none justify-center">
              <Star className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Score</span> Unscored
            </button>
            <button onClick={batchEnrich} disabled={!!batch || loading} className="btn-secondary py-2 text-xs flex-1 sm:flex-none justify-center">
              <Brain className="w-3.5 h-3.5" /> Enrich New
            </button>
            <button onClick={load} disabled={loading} className="btn-secondary py-2 flex-1 sm:flex-none justify-center">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>
        {/* Batch progress */}
        {batch && (
          <div className="mb-3 bg-brand-orange-50 border border-brand-orange/25 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-brand-orange animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-brand-charcoal">{batch.action} leads…</p>
                <p className="text-xs text-brand-orange">{batch.done}/{batch.total}</p>
              </div>
              <div className="h-1.5 bg-brand-orange-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-orange rounded-full transition-all duration-300"
                  style={{ width: `${(batch.done / batch.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted pointer-events-none" />
            <input
              className="input pl-8 pr-3 py-1.5 text-xs"
              placeholder="Search name, company, email…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <select className="input text-xs py-1.5 pr-6 flex-1 sm:flex-none sm:min-w-[130px]" value={stageFilter} onChange={e => setStage(e.target.value)}>
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select className="input text-xs py-1.5 pr-6 flex-1 sm:flex-none sm:min-w-[110px]" value={icpFilter} onChange={e => setICP(e.target.value)}>
              <option value="">All ICP</option>
              {["high","medium","low"].map(i => <option key={i} value={i}>{capitalize(i)} ICP</option>)}
            </select>
          </div>
          {(query || stageFilter || icpFilter) && (
            <button onClick={() => { setQuery(""); setStage(""); setICP(""); }} className="btn-ghost text-xs py-1.5">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table + panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-brand-border">
        <div className="flex-1 overflow-auto min-w-0">
          {loading
            ? <div className="flex items-center justify-center h-48 gap-3">
                <Loader2 className="w-5 h-5 text-brand-orange animate-spin" />
                <span className="text-sm text-brand-muted">Loading leads…</span>
              </div>
            : <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-brand-border">
                {filtered.length === 0 ? (
                  <p className="py-16 text-center text-sm text-brand-muted px-4">No leads match your filters</p>
                ) : filtered.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
                    className={`relative w-full text-left px-4 py-4 transition-colors ${
                      selected?.id === lead.id ? "bg-brand-orange-50" : "hover:bg-brand-surface"
                    }`}
                  >
                    {selected?.id === lead.id && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-brand-orange rounded-r-sm" aria-hidden="true" />
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-charcoal text-sm truncate">{lead.name}</p>
                        <p className="text-[11px] text-brand-muted truncate">{lead.title} · {lead.company}</p>
                      </div>
                      <span className={`badge border shrink-0 ${stageBadge(lead.stage)}`}>{capitalize(lead.stage)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {lead.score != null && (
                        <>
                          <span className={`badge text-[10px] border ${scoreColor(lead.score)}`}>{lead.score}</span>
                          <div className="flex-1 min-w-[80px] max-w-[120px]"><ScoreBar score={lead.score} /></div>
                        </>
                      )}
                      {lead.icp_fit && (
                        <span className={`badge text-[10px] border ${icpBadge(lead.icp_fit)}`}>{capitalize(lead.icp_fit)}</span>
                      )}
                      {lead.deal_value && (
                        <span className="text-[11px] font-semibold text-brand-charcoal">{formatCurrency(lead.deal_value, lead.currency)}</span>
                      )}
                      <span className="text-[10px] text-brand-muted ml-auto">{timeAgo(lead.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-surface">
                    {[
                      { h: "Lead", cls: "" },
                      { h: "Stage", cls: "" },
                      { h: "Score", cls: "" },
                      { h: "ICP", cls: "hidden lg:table-cell" },
                      { h: "Deal Value", cls: "" },
                      { h: "Added", cls: "hidden xl:table-cell" },
                      { h: "Actions", cls: "" },
                    ].map(({ h, cls }) => (
                      <th key={h} className={`px-3 lg:px-4 py-3 text-left text-[11px] font-bold text-brand-muted uppercase tracking-wider whitespace-nowrap border-r border-brand-border last:border-r-0 ${cls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
                      className={`border-b border-brand-border cursor-pointer transition-colors ${
                        selected?.id === lead.id ? "bg-brand-orange-50" : "hover:bg-brand-surface/80"
                      }`}
                    >
                      <td className="px-3 lg:px-4 py-3.5 border-r border-brand-border">
                        <div className="min-w-[140px]">
                          <p className="font-semibold text-brand-charcoal text-sm truncate">{lead.name}</p>
                          <p className="text-[11px] text-brand-muted truncate">{lead.title} · {lead.company}</p>
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 py-3.5 border-r border-brand-border">
                        <span className={`badge border ${stageBadge(lead.stage)}`}>{capitalize(lead.stage)}</span>
                      </td>
                      <td className="px-3 lg:px-4 py-3.5 w-28 lg:w-36 border-r border-brand-border">
                        {lead.score != null
                          ? <div className="space-y-1.5">
                              <span className={`badge text-[10px] border ${scoreColor(lead.score)}`}>{lead.score}</span>
                              <ScoreBar score={lead.score} />
                            </div>
                          : <span className="text-[11px] text-brand-muted">—</span>
                        }
                      </td>
                      <td className="px-3 lg:px-4 py-3.5 hidden lg:table-cell border-r border-brand-border">
                        {lead.icp_fit
                          ? <span className={`badge text-[10px] border ${icpBadge(lead.icp_fit)}`}>{capitalize(lead.icp_fit)}</span>
                          : <span className="text-[11px] text-brand-muted">—</span>
                        }
                      </td>
                      <td className="px-3 lg:px-4 py-3.5 font-semibold text-brand-charcoal whitespace-nowrap border-r border-brand-border">
                        {lead.deal_value ? formatCurrency(lead.deal_value, lead.currency) : <span className="text-brand-muted">—</span>}
                      </td>
                      <td className="px-3 lg:px-4 py-3.5 text-[11px] text-brand-muted whitespace-nowrap hidden xl:table-cell border-r border-brand-border">{timeAgo(lead.created_at)}</td>
                      <td className="px-3 lg:px-4 py-3.5">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelected(l => l?.id === lead.id ? null : lead)} className="btn-ghost p-1.5">
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selected?.id === lead.id ? "rotate-90" : ""}`} />
                          </button>
                          <button onClick={() => deleteLead(lead.id)} className="btn-ghost p-1.5 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-brand-muted">
                        No leads match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </>
          }
        </div>

        {selected && (
          <>
            {/* Mobile backdrop */}
            <div
              className="md:hidden fixed inset-0 z-30 bg-brand-charcoal/40"
              onClick={() => setSelected(null)}
            />
            <div className="fixed inset-y-0 right-0 z-40 w-full sm:max-w-sm md:relative md:inset-auto md:z-auto md:w-80 lg:w-96 md:max-w-none md:shrink-0 border-l border-brand-border">
              <DetailPanel
                lead={selected}
                onClose={() => setSelected(null)}
                onUpdate={update}
                onEnrichClick={setEnrich}
              />
            </div>
          </>
        )}
      </div>

      {enrichTarget && (
        <EnrichmentModal
          lead={enrichTarget}
          onComplete={updated => {
            update(updated);
            setEnrich(null);
            toast.success(`ICP: ${capitalize(updated.icp_fit ?? "unknown")}`);
          }}
          onError={() => {
            setEnrich(null);
            toast.error("Enrichment failed");
          }}
        />
      )}
      </div>
    </div>
  );
}
