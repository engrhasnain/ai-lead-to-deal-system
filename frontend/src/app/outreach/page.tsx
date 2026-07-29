"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2, RefreshCw, Mail, Sparkles, Copy, CheckCircle2,
  Search, User, Building2, ChevronRight, Send, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

import { leadsApi } from "@/lib/api";
import { capitalize, icpBadge, scoreColor, stageBadge, timeAgo } from "@/lib/utils";
import type { Lead, Email, EmailType } from "@/types";

const SEQUENCE: { key: EmailType; label: string; day: string; desc: string; dayNum: number }[] = [
  { key: "cold",        label: "Cold Outreach",  day: "Day 1",  desc: "First contact — personalized intro",  dayNum: 1  },
  { key: "follow_up_1", label: "Follow-up 1",    day: "Day 3",  desc: "Add social proof and case study",     dayNum: 3  },
  { key: "follow_up_2", label: "Follow-up 2",    day: "Day 7",  desc: "Final touch — soft close attempt",    dayNum: 7  },
  { key: "proposal",    label: "Proposal",        day: "Custom", desc: "Formal proposal delivery email",      dayNum: 14 },
];

const EMAIL_TYPES = SEQUENCE;

// ── Typewriter reveal ─────────────────────────────────────
function TypewriterText({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  const onDoneRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = false;
    setShown(0);
  }, [text]);

  useEffect(() => {
    if (shown >= text.length) { onDoneRef.current = true; return; }
    const t = setTimeout(() => setShown(c => c + 3), 12);
    return () => clearTimeout(t);
  }, [shown, text]);

  const isDone = shown >= text.length;

  return (
    <span>
      {text.slice(0, shown)}
      {!isDone && (
        <span className="inline-block w-0.5 h-3.5 bg-orange-500 rounded-sm ml-px"
          style={{ animation: "twBlink 0.7s step-end infinite" }} />
      )}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function OutreachPage() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState("");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [emailType, setEmailType]   = useState<EmailType>("cold");
  const [generating, setGenerating] = useState(false);
  const [email, setEmail]           = useState<Email | null>(null);
  const [copied, setCopied]         = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "compose">("list");

  const load = async () => {
    setLoading(true);
    try {
      const all = await leadsApi.list();
      setLeads(all);
      if (!activeLead && all.length > 0) setActiveLead(all[0]);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredLeads = leads.filter(l => {
    const q = query.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q);
  });

  const handleGenerate = async () => {
    if (!activeLead) return;
    setGenerating(true);
    setEmail(null);
    try {
      const result = await leadsApi.email(activeLead.id, emailType);
      setEmail(result);
      // refresh lead to get updated emails list
      const updated = await leadsApi.get(activeLead.id);
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      setActiveLead(updated);
      toast.success("Email generated");
    } catch {
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const selectLead = (lead: Lead) => {
    setActiveLead(lead);
    setEmail(null);
    setMobileView("compose");
  };

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex overflow-hidden">

      {/* Left: lead selector — list starts at top to align with right header */}
      <div className={`${mobileView === "compose" ? "hidden" : "flex"} md:flex w-full md:w-72 lg:w-80 shrink-0 border-r border-brand-border bg-white flex-col`}>
        <div className="flex-1 overflow-y-auto divide-y divide-brand-border min-h-0">
          {loading
            ? <div className="flex items-center justify-center py-10 gap-2">
                <Loader2 className="w-4 h-4 text-brand-orange animate-spin" />
                <span className="text-xs text-brand-muted">Loading…</span>
              </div>
            : filteredLeads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => selectLead(lead)}
                  className={`relative w-full text-left px-4 py-3 hover:bg-brand-surface transition-colors flex items-center gap-3 ${
                    activeLead?.id === lead.id ? "bg-brand-orange-50" : ""
                  }`}
                >
                  {activeLead?.id === lead.id && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-brand-orange rounded-r-sm" aria-hidden="true" />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-brand-orange-50 flex items-center justify-center shrink-0 text-xs font-black text-brand-orange">
                    {lead.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-brand-charcoal truncate">{lead.name}</p>
                    <p className="text-[10px] text-brand-muted truncate">{lead.company}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`badge text-[9px] border ${stageBadge(lead.stage)}`}>{capitalize(lead.stage)}</span>
                      {lead.emails.length > 0 && (
                        <span className="text-[9px] text-brand-orange font-semibold">{lead.emails.length} emails</span>
                      )}
                    </div>
                  </div>
                  {activeLead?.id === lead.id && <ChevronRight className="w-3 h-3 text-brand-orange shrink-0" />}
                </button>
              ))
          }
        </div>

        <div className="px-4 py-3 border-t border-brand-border shrink-0 bg-white">
          <h2 className="text-sm font-black text-brand-charcoal mb-2">Select Lead</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted pointer-events-none" />
            <input
              className="input pl-8 w-full text-xs py-1.5"
              placeholder="Search leads…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Right: email composer */}
      <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden bg-brand-surface/50`}>
        {!activeLead
          ? <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Mail className="w-6 h-6 text-orange-400" />
              </div>
              <p className="text-sm font-bold text-zinc-500">Select a lead to write outreach</p>
            </div>
          : <div className="flex-1 flex flex-col overflow-hidden">

              {/* Lead header — top aligns with first sidebar lead row */}
              <div className="px-4 md:px-6 py-3 border-b border-brand-border bg-white shrink-0 min-h-[72px] flex flex-col justify-center">
                {/* Mobile back button */}
                <button
                  onClick={() => setMobileView("list")}
                  className="md:hidden flex items-center gap-1.5 text-xs text-zinc-500 mb-2 -ml-1 hover:text-zinc-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> All Leads
                </button>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-black text-zinc-900">{activeLead.name}</h2>
                      {activeLead.icp_fit && (
                        <span className={`badge text-[10px] border ${icpBadge(activeLead.icp_fit)}`}>ICP {capitalize(activeLead.icp_fit)}</span>
                      )}
                      {activeLead.score != null && (
                        <span className={`badge text-[10px] border ${scoreColor(activeLead.score)}`}>Score {activeLead.score}</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{activeLead.title} · {activeLead.company} · {activeLead.industry}</p>
                    {activeLead.ai_summary && (
                      <p className="text-xs text-zinc-400 mt-2 max-w-xl leading-relaxed">{activeLead.ai_summary}</p>
                    )}
                  </div>
                  <button onClick={load} disabled={loading} className="btn-secondary py-1.5 text-xs shrink-0">
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* AI monitor */}
              <div className="px-4 md:px-6 py-2 bg-brand-orange-50 border-b border-brand-orange-100 flex items-center gap-2 text-[11px] text-brand-orange-dark shrink-0 overflow-hidden">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-orange-500" />
                </span>
                <span className="truncate font-medium">AI writing model claude-sonnet-4-6 · personalizes each email to lead profile and ICP data</span>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">

                {/* Sequence cadence */}
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Outreach Sequence</p>
                  <div className="relative">
                    {/* Connector line */}
                    <div className="absolute left-[19px] top-6 bottom-6 w-px bg-zinc-200 z-0" />
                    <div className="space-y-2 relative z-10">
                      {SEQUENCE.map((step, idx) => {
                        const hasEmail = activeLead?.emails.some(e => e.email_type === step.key);
                        const isActive = emailType === step.key;
                        const isGeneratingThis = generating && isActive;
                        return (
                          <button
                            key={step.key}
                            onClick={() => { setEmailType(step.key); setEmail(null); }}
                            className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isActive
                                ? "bg-orange-50 border-orange-300 ring-1 ring-orange-200"
                                : "bg-white border-zinc-200 hover:border-orange-200 hover:bg-orange-50/40"
                            }`}
                          >
                            {/* Step indicator */}
                            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black border-2 ${
                              hasEmail
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : isActive
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-white border-zinc-300 text-zinc-400"
                            }`}>
                              {hasEmail ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-xs font-bold ${isActive ? "text-zinc-900" : "text-zinc-800"}`}>{step.label}</p>
                                <span className={`badge text-[9px] border ${
                                  hasEmail
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isActive
                                    ? "bg-orange-100 text-orange-600 border-orange-200"
                                    : "bg-zinc-50 text-zinc-400 border-zinc-200"
                                }`}>{step.day}</span>
                                {hasEmail && <span className="text-[9px] text-emerald-600 font-bold">DONE</span>}
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{step.desc}</p>
                            </div>

                            {isGeneratingThis && <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />}
                            {!isGeneratingThis && isActive && <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn-primary w-full justify-center py-3"
                >
                  {generating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing personalized email…</>
                    : <><Sparkles className="w-4 h-4" /> Generate {SEQUENCE.find(e => e.key === emailType)?.label}</>
                  }
                </button>

                {/* Generated email */}
                {generating && (
                  <div className="bg-white rounded-2xl border border-orange-200 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">AI Writing Email</p>
                        <p className="text-[11px] text-orange-600">Analyzing lead profile and personalizing content…</p>
                      </div>
                      <Loader2 className="w-4 h-4 text-orange-400 animate-spin ml-auto" />
                    </div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-3 bg-orange-100 rounded-full mb-2 animate-pulse ${i === 3 ? "w-2/3" : "w-full"}`}
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                )}

                {email && !generating && (
                  <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm ai-reveal">
                    {/* Email header */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-orange-50 border-b border-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">
                            {EMAIL_TYPES.find(e => e.key === email.email_type)?.label}
                          </p>
                          <p className="text-[11px] text-orange-600">Generated by Claude AI · {timeAgo(email.generated_at)}</p>
                        </div>
                      </div>
                      <button onClick={handleCopy}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                          copied ? "bg-emerald-100 text-emerald-700" : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200"
                        }`}>
                        {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                      </button>
                    </div>

                    {/* Subject */}
                    <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide mb-0.5">Subject</p>
                      <p className="text-sm font-semibold text-zinc-800">{email.subject}</p>
                    </div>

                    {/* Body with typewriter */}
                    <div className="px-5 py-4">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide mb-3">Body</p>
                      <pre className="text-sm text-zinc-700 font-sans leading-relaxed whitespace-pre-wrap">
                        <TypewriterText text={email.body} />
                      </pre>
                    </div>

                    {/* Action bar */}
                    <div className="px-4 sm:px-5 py-3 border-t border-brand-border bg-brand-surface/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button className="btn-primary py-2 text-xs gap-1.5 justify-center">
                        <Send className="w-3.5 h-3.5" /> Send via Gmail
                      </button>
                      <button onClick={handleGenerate} className="btn-secondary py-2 text-xs gap-1.5 justify-center">
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                      <p className="sm:ml-auto text-[10px] text-brand-muted text-center sm:text-right">Copy and paste into your email client</p>
                    </div>
                  </div>
                )}

                {/* Previous emails for this lead */}
                {activeLead.emails.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Previous Emails ({activeLead.emails.length})</p>
                    <div className="space-y-2">
                      {activeLead.emails.map(e => (
                        <div key={e.id} className="bg-white rounded-xl border border-zinc-200 p-3.5">
                          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="badge text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                {EMAIL_TYPES.find(et => et.key === e.email_type)?.label ?? capitalize(e.email_type)}
                              </span>
                              {e.opened_at
                                ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" /> Opened {timeAgo(e.opened_at)}
                                  </span>
                                : <span className="text-[10px] text-zinc-400">Not opened</span>
                              }
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-400">{timeAgo(e.generated_at)}</span>
                              {!e.opened_at && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await leadsApi.openEmail(activeLead.id, e.id);
                                      const updated = await leadsApi.get(activeLead.id);
                                      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                                      setActiveLead(updated);
                                      toast.success("Email marked as opened");
                                    } catch { toast.error("Failed"); }
                                  }}
                                  className="text-[10px] font-semibold text-orange-600 hover:text-orange-700 underline"
                                >
                                  Simulate Open
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-zinc-700 mb-1">{e.subject}</p>
                          <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">{e.body.slice(0, 120)}…</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
        }
      </div>
    </div>
  );
}
