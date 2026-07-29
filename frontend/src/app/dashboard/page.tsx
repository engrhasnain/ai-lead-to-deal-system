"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Users, DollarSign, Sparkles, Target,
  TrendingUp, ArrowRight, AlertTriangle, CheckCircle2,
  Brain, Mail, Star, GitBranch, RefreshCw, Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { dashboardApi } from "@/lib/api";
import { formatCurrency, capitalize, scoreColor, icpBadge, stageBadge } from "@/lib/utils";
import type { DashboardData } from "@/types";

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  enriched:     <Brain className="w-3.5 h-3.5 text-orange-500" />,
  scored:       <Star className="w-3.5 h-3.5 text-amber-500" />,
  email_sent:   <Mail className="w-3.5 h-3.5 text-blue-500" />,
  email_opened: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  stage_change: <GitBranch className="w-3.5 h-3.5 text-zinc-500" />,
  note_added:   <Zap className="w-3.5 h-3.5 text-zinc-500" />,
  created:      <Users className="w-3.5 h-3.5 text-zinc-400" />,
  next_action:  <ArrowRight className="w-3.5 h-3.5 text-orange-400" />,
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function today(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await dashboardApi.get()); }
    catch { toast.error("Failed to load dashboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
      <Loader2 className="w-6 h-6 text-brand-orange animate-spin" />
      <p className="text-sm text-brand-muted">Loading dashboard…</p>
    </div>
  );

  const quotaPct = data.quota_target > 0
    ? Math.min(100, Math.round((data.quota_achieved / data.quota_target) * 100))
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal">{greeting()}, Sales Team</h1>
          <p className="text-sm text-brand-muted mt-0.5">{today()} · {data.total_leads} leads in pipeline</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={load} disabled={loading} className="btn-secondary py-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/pipeline" className="btn-primary py-2">
            <GitBranch className="w-3.5 h-3.5" /> View Pipeline
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Active Pipeline",
            value: formatCurrency(data.pipeline_value),
            sub: `${data.total_leads} total leads`,
            icon: TrendingUp,
            color: "text-brand-orange",
            bg: "bg-brand-orange-50",
            ring: "ring-brand-orange/25",
          },
          {
            label: "Won This Quarter",
            value: formatCurrency(data.won_this_quarter),
            sub: formatCurrency(data.won_this_month) + " this month",
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            ring: "ring-emerald-200",
          },
          {
            label: "AI Actions Taken",
            value: String(data.ai_actions_total),
            sub: "enrichments + scores + emails",
            icon: Sparkles,
            color: "text-brand-orange",
            bg: "bg-brand-orange-50",
            ring: "ring-brand-orange/25",
          },
          {
            label: "Quota Progress",
            value: `${quotaPct}%`,
            sub: `${formatCurrency(data.quota_achieved)} of ${formatCurrency(data.quota_target)}`,
            icon: Target,
            color: "text-amber-600",
            bg: "bg-amber-50",
            ring: "ring-amber-200",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg, ring }) => (
          <div key={label} className="card p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 shrink-0 ${bg} ${ring}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wider truncate">{label}</p>
              <p className="text-xl sm:text-2xl font-black text-brand-charcoal tabular-nums leading-tight mt-0.5">{value}</p>
              <p className="text-xs text-brand-muted mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quota progress bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-zinc-800">Monthly Quota Tracker</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatCurrency(data.quota_achieved)} closed of {formatCurrency(data.quota_target)} target
            </p>
          </div>
          <span className={`text-sm font-black tabular-nums ${
            quotaPct >= 100 ? "text-emerald-600" : quotaPct >= 60 ? "text-brand-yellow" : "text-brand-orange"
          }`}>{quotaPct}%</span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              quotaPct >= 100 ? "bg-emerald-500" : quotaPct >= 60 ? "bg-brand-yellow" : "bg-brand-orange"
            }`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-brand-muted gap-1 overflow-x-auto">
          <span className="shrink-0">$0</span>
          <span className="font-semibold text-brand-charcoal-light hidden sm:inline shrink-0">25% — $125k</span>
          <span className="font-semibold text-brand-charcoal-light hidden md:inline shrink-0">50% — $250k</span>
          <span className="font-semibold text-brand-charcoal-light hidden lg:inline shrink-0">75% — $375k</span>
          <span className="shrink-0">{formatCurrency(data.quota_target)}</span>
        </div>
      </div>

      {/* Two-column: deals + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Deals closing this week */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-800">Deals Closing This Week</p>
              <p className="text-xs text-zinc-400 mt-0.5">Proposal + Negotiation stage, sorted by score</p>
            </div>
            <Link href="/pipeline" className="text-[11px] font-semibold text-orange-600 hover:text-orange-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {data.deals_closing_week.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">No active deals</p>
            ) : data.deals_closing_week.map(lead => (
              <Link
                key={lead.id}
                href="/pipeline"
                className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-xs font-black text-orange-700">
                  {lead.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{lead.name}</p>
                    {lead.days_in_stage > 14 && (
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{lead.company}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-zinc-800">
                    {lead.deal_value ? formatCurrency(lead.deal_value) : "—"}
                  </p>
                  <span className={`badge text-[9px] border ${stageBadge(lead.stage)}`}>
                    {capitalize(lead.stage)}
                  </span>
                </div>
                {lead.score != null && (
                  <span className={`badge text-[10px] border ${scoreColor(lead.score)} shrink-0`}>
                    {lead.score}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Top leads by score */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-800">Top Leads by AI Score</p>
              <p className="text-xs text-zinc-400 mt-0.5">Highest-priority active opportunities</p>
            </div>
            <Link href="/leads" className="text-[11px] font-semibold text-orange-600 hover:text-orange-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {data.top_leads.map((lead, i) => (
              <div key={lead.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-black text-zinc-300 w-4 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 truncate">{lead.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{lead.company} · {lead.stage}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.icp_fit && (
                    <span className={`badge text-[9px] border ${icpBadge(lead.icp_fit)}`}>
                      ICP {capitalize(lead.icp_fit)}
                    </span>
                  )}
                  {lead.score != null && (
                    <span className={`badge text-[10px] border ${scoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Activity Feed */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-800">AI Activity Feed</p>
            <p className="text-xs text-zinc-400">Recent enrichments, scores, emails, and stage moves</p>
          </div>
        </div>
        <div className="divide-y divide-zinc-50">
          {data.recent_activities.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-8">No recent activity</p>
          ) : data.recent_activities.map((act, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <div className="w-6 h-6 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                {ACTIVITY_ICONS[act.event_type] ?? <Zap className="w-3 h-3 text-zinc-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800 truncate">{act.lead_name}</p>
                <p className="text-[11px] text-zinc-500 leading-snug">{act.description}</p>
              </div>
              <span className="text-[10px] text-zinc-400 shrink-0 mt-0.5">{act.time_ago}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/pipeline",  label: "View Pipeline",    icon: GitBranch,  color: "text-brand-orange bg-brand-orange-50" },
          { href: "/leads",     label: "Manage Leads",     icon: Users,       color: "text-brand-charcoal-light bg-brand-surface" },
          { href: "/outreach",  label: "Write Outreach",   icon: Mail,        color: "text-brand-orange bg-brand-orange-50"   },
          { href: "/analytics", label: "View Analytics",   icon: TrendingUp,  color: "text-emerald-600 bg-emerald-50" },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-700">{label}</span>
            <ArrowRight className="w-3 h-3 text-zinc-300 ml-auto shrink-0" />
          </Link>
        ))}
      </div>

      <div className="h-4" />
    </div>
  );
}
