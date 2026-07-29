"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2, RefreshCw, Sparkles, TrendingUp, Users,
  DollarSign, Target, CheckCircle2, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, PieChart, Pie, Legend, FunnelChart, Funnel, LabelList,
} from "recharts";
import toast from "react-hot-toast";

import { analyticsApi } from "@/lib/api";
import { formatCurrency, capitalize } from "@/lib/utils";
import type { PipelineAnalytics, PipelineReport, ForecastData } from "@/types";
import StatCard from "@/components/ui/StatCard";

// ── Count-up hook ─────────────────────────────────────────
function useCountUp(target: number): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    setVal(0);
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return val;
}

// ── Streaming report ──────────────────────────────────────
function StreamingReport({ report, onDone }: { report: PipelineReport; onDone: () => void }) {
  const lines = report.report.split("\n");
  const [count, setCount] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const isStreaming = count < lines.length;

  useEffect(() => {
    if (count >= lines.length) { onDoneRef.current(); return; }
    const line = lines[count] ?? "";
    const delay = !line.trim() ? 8 : line.startsWith("## ") ? 120 : line.startsWith("### ") ? 60 : 32;
    const t = setTimeout(() => setCount(c => c + 1), delay);
    return () => clearTimeout(t);
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-md">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-orange-50 border-b border-orange-100">
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-900">AI Pipeline Intelligence Report</p>
          <p className="text-[11px] text-orange-600 font-medium">
            Generated {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${
          isStreaming ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-700"
        }`}>
          {isStreaming
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Writing report…</>
            : <><CheckCircle2 className="w-3 h-3" /> Claude AI</>
          }
        </div>
      </div>
      <div className="px-6 py-5 space-y-1">
        {lines.slice(0, count).map((line, i) => {
          const rev = i === count - 1 ? "ai-reveal" : "";
          if (line.startsWith("## "))
            return <h2 key={i} className={`text-base font-black text-zinc-900 mt-5 mb-1 pb-2 border-b border-zinc-100 flex items-center gap-2 ${rev}`}>
              <ChevronRight className="w-4 h-4 text-orange-500 shrink-0" />{line.slice(3)}
            </h2>;
          if (line.startsWith("### "))
            return <h3 key={i} className={`text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-4 mb-1 ${rev}`}>{line.slice(4)}</h3>;
          if (line.startsWith("- "))
            return <div key={i} className={`flex gap-2 items-start text-sm text-zinc-600 pl-1 ${rev}`}>
              <span className="text-orange-400 mt-1.5 shrink-0">•</span>
              <span className="leading-relaxed">{line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1")}</span>
            </div>;
          if (line === "---") return <hr key={i} className="my-3 border-zinc-100" />;
          if (!line.trim()) return <div key={i} className="h-1" />;
          return <p key={i} className={`text-sm text-zinc-600 leading-relaxed ${rev}`}>{line.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
        })}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-orange-500 rounded-sm"
            style={{ animation: "twBlink 0.8s step-end infinite" }} />
        )}
      </div>
    </div>
  );
}

// ── Win rate gauge ─────────────────────────────────────────
function WinGauge({ rate }: { rate: number }) {
  const circ = 2 * Math.PI * 48;
  const color = rate >= 30 ? "#10b981" : rate >= 15 ? "#d97706" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
          <circle cx="55" cy="55" r="48" fill="none" stroke="#f4f4f5" strokeWidth="10" />
          <circle cx="55" cy="55" r="48" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(rate / 100) * circ} ${circ}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-zinc-900 tabular-nums">{rate}%</p>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">win rate</p>
        </div>
      </div>
      <p className="text-xs text-zinc-500 text-center">B2B benchmark: 25%</p>
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  new: "#888888", qualified: "#F26522", proposal: "#555555",
  negotiation: "#F5B800", won: "#10b981", lost: "#888888",
};
const PIE_COLORS = ["#F26522", "#F5B800", "#10b981", "#FF8C42", "#555555", "#888888"];

// ── Main page ─────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData]         = useState<PipelineAnalytics | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [report, setReport]     = useState<PipelineReport | null>(null);
  const [generating, setGen]    = useState(false);
  const [streaming, setStream]  = useState(false);

  // Count-up hooks — must be before early returns
  const cTotal   = useCountUp(data?.total_leads   ?? 0);
  const cValue   = useCountUp(data?.total_value   ?? 0);
  const cHighICP = useCountUp(data?.high_icp      ?? 0);
  const cScored  = useCountUp(data?.scored_leads  ?? 0);

  const load = async () => {
    setLoading(true);
    try {
      const [pipeline, fcast] = await Promise.all([
        analyticsApi.pipeline(),
        analyticsApi.forecast(),
      ]);
      setData(pipeline);
      setForecast(fcast);
    }
    catch { toast.error("Failed to load analytics"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleReport = async () => {
    setGen(true);
    setReport(null);
    setStream(false);
    try {
      const r = await analyticsApi.report();
      setStream(true);
      setReport(r);
      toast.success("Report generated");
      setTimeout(() => {
        document.getElementById("report-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch {
      toast.error("Report generation failed");
    } finally {
      setGen(false);
    }
  };

  if (loading || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
      <Loader2 className="w-6 h-6 text-brand-orange animate-spin" />
      <p className="text-sm text-brand-muted">Loading analytics…</p>
    </div>
  );

  const stageOrder = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
  const stageLabels: Record<string, string> = {
    new: "New", qualified: "Qualified", proposal: "Proposal",
    negotiation: "Negot.", won: "Won", lost: "Lost",
  };

  const funnelData = stageOrder.map(s => ({
    name: stageLabels[s], value: data.by_stage[s] ?? 0, fill: STAGE_COLORS[s],
  })).filter(d => d.value > 0);

  const valueData = stageOrder.map(s => ({
    name: stageLabels[s], value: Math.round(data.by_stage_value[s] ?? 0), fill: STAGE_COLORS[s],
  })).filter(d => d.value > 0);

  const srcData = Object.entries(data.by_source).map(([name, value]) => ({ name, value }));
  const indData = Object.entries(data.by_industry).map(([name, value]) => ({ name, value }));

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-brand-charcoal">Pipeline Analytics</h1>
            <p className="text-xs text-brand-muted mt-0.5">Revenue intelligence and AI-generated insights</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button onClick={load} disabled={loading} className="btn-secondary py-2 flex-1 sm:flex-none justify-center">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleReport} disabled={generating || loading} className="btn-primary py-2 flex-1 sm:flex-none justify-center">
              {generating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                : <><Sparkles className="w-3.5 h-3.5" />{report ? "Regenerate Report" : "AI Pipeline Report"}</>
              }
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Leads"    value={String(cTotal)}
            subtitle={`${data.scored_leads} scored`} icon={Users} accent="indigo" />
          <StatCard title="Pipeline Value" value={formatCurrency(cValue)}
            subtitle={`avg ${formatCurrency(data.avg_deal_size)}`} icon={DollarSign} accent="emerald"
            trend={{ label: data.win_rate >= 25 ? "Above benchmark" : "Below benchmark", positive: data.win_rate >= 25 }} />
          <StatCard title="High ICP Leads" value={String(cHighICP)}
            subtitle="Priority prospects" icon={Target} accent="violet" />
          <StatCard title="Leads Scored"   value={String(cScored)}
            subtitle={`${data.total_leads > 0 ? Math.round(cScored / data.total_leads * 100) : 0}% coverage`}
            icon={TrendingUp} accent="amber" />
        </div>

        {/* Stage funnel + win gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-800">Pipeline Funnel — Lead Count</h2>
            <p className="text-xs text-zinc-400 mt-0.5 mb-4">Leads in each stage</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} barSize={42} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} leads`, ""]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-zinc-800">Win Rate</h2>
            <p className="text-xs text-zinc-400 mt-0.5 mb-3">Closed-won vs closed-lost</p>
            <WinGauge rate={data.win_rate} />
            <div className="mt-4 space-y-2">
              {[
                { label: "Won",  count: data.by_stage.won  ?? 0, dot: "bg-emerald-500" },
                { label: "Lost", count: data.by_stage.lost ?? 0, dot: "bg-zinc-400"    },
              ].map(({ label, count, dot }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-zinc-500">{label}</span>
                  </div>
                  <span className="font-bold text-zinc-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline value by stage */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-zinc-800">Pipeline Value by Stage</h2>
          <p className="text-xs text-zinc-400 mt-0.5 mb-4">Total deal value across each stage</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={valueData} layout="vertical" barSize={22} margin={{ left: 16, right: 32 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#52525b" }} axisLine={false} tickLine={false} width={72} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), "Value"]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {valueData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source + Industry breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-zinc-800">Leads by Source</h2>
            <p className="text-xs text-zinc-400 mt-0.5 mb-4">Where leads are coming from</p>
            {srcData.length === 0
              ? <div className="h-48 flex items-center justify-center text-xs text-zinc-300">No data</div>
              : <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={srcData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={74} innerRadius={36}>
                      {srcData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip formatter={(v: number) => [`${v} leads`, ""]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-zinc-800">Leads by Industry</h2>
            <p className="text-xs text-zinc-400 mt-0.5 mb-4">Industry distribution</p>
            {indData.length === 0
              ? <div className="h-48 flex items-center justify-center text-xs text-zinc-300">No data</div>
              : <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={indData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={74} innerRadius={36}>
                      {indData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip formatter={(v: number) => [`${v} leads`, ""]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Revenue Forecast */}
        {forecast && (
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
              <div>
                <h2 className="text-sm font-semibold text-brand-charcoal">Revenue Forecast</h2>
                <p className="text-xs text-brand-muted mt-0.5">Weighted pipeline by stage probability</p>
              </div>
              <div className="flex items-center gap-4 sm:text-right shrink-0">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Weighted Pipeline</p>
                  <p className="text-xl font-black text-zinc-900 tabular-nums">{formatCurrency(forecast.weighted_pipeline)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Exp. Close Quarter</p>
                  <p className="text-xl font-black text-emerald-600 tabular-nums">{formatCurrency(forecast.expected_close_quarter)}</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left pb-2 font-bold text-zinc-400 uppercase tracking-wide text-[10px]">Stage</th>
                    <th className="text-right pb-2 font-bold text-zinc-400 uppercase tracking-wide text-[10px]">Count</th>
                    <th className="text-right pb-2 font-bold text-zinc-400 uppercase tracking-wide text-[10px]">Total Value</th>
                    <th className="text-right pb-2 font-bold text-zinc-400 uppercase tracking-wide text-[10px]">Probability</th>
                    <th className="text-right pb-2 font-bold text-zinc-400 uppercase tracking-wide text-[10px]">Weighted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {forecast.probability_by_stage.map(s => (
                    <tr key={s.stage} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-2.5 font-semibold text-zinc-700 capitalize">{s.stage}</td>
                      <td className="py-2.5 text-right text-zinc-500">{s.count}</td>
                      <td className="py-2.5 text-right text-zinc-700 font-semibold">{formatCurrency(s.value)}</td>
                      <td className="py-2.5 text-right">
                        <span className="badge text-[10px] border bg-orange-50 text-orange-700 border-orange-200">{s.probability}%</span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-700">{formatCurrency(s.weighted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quota Tracker */}
        {forecast && (() => {
          const quotaTarget = 500000;
          const quotaAchieved = data?.by_stage_value?.won ?? 0;
          const pct = Math.min(100, Math.round((quotaAchieved / quotaTarget) * 100));
          return (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-800">Quarterly Quota Tracker</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatCurrency(quotaAchieved)} closed of {formatCurrency(quotaTarget)} target
                  </p>
                </div>
                <span className={`text-xl font-black tabular-nums ${
                  pct >= 100 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-orange-600"
                }`}>{pct}%</span>
              </div>
              <div className="h-4 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-orange-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-400">
                <span>$0</span>
                <span>Target: {formatCurrency(quotaTarget)}</span>
              </div>
            </div>
          );
        })()}

        {/* Lost Reasons */}
        {forecast && Object.keys(forecast.lost_reasons).length > 0 && (() => {
          const total = Object.values(forecast.lost_reasons).reduce((s, n) => s + n, 0);
          const REASON_COLORS = ["#F26522","#F5B800","#555555","#888888","#FF8C42","#10b981"];
          const reasonData = Object.entries(forecast.lost_reasons).map(([name, value]) => ({ name, value }));
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-zinc-800">Lost Deal Reasons</h2>
                <p className="text-xs text-zinc-400 mt-0.5 mb-4">Why deals are not closing</p>
                <div className="space-y-3">
                  {reasonData.map(({ name, value }, i) => {
                    const pct = Math.round((value / total) * 100);
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-zinc-700">{name}</span>
                          <span className="text-xs text-zinc-400">{value} deal{value !== 1 ? "s" : ""} · {pct}%</span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: REASON_COLORS[i % REASON_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-zinc-800">Lost Reasons Breakdown</h2>
                <p className="text-xs text-zinc-400 mt-0.5 mb-4">Distribution by reason</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={74} innerRadius={36}>
                      {reasonData.map((_, i) => <Cell key={i} fill={REASON_COLORS[i % REASON_COLORS.length]} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip formatter={(v: number) => [`${v} deals`, ""]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* AI Report section */}
        <div id="report-section">
          {report
            ? streaming
              ? <StreamingReport report={report} onDone={() => setStream(false)} />
              : <StreamingReport report={report} onDone={() => {}} />
            : (
              <div className="bg-white rounded-2xl border border-dashed border-zinc-300 flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-sm font-bold text-zinc-700">AI Pipeline Report Not Generated Yet</p>
                <p className="text-xs text-zinc-400 max-w-xs text-center leading-relaxed">
                  Click "AI Pipeline Report" above — Claude analyses your sales data and delivers actionable intelligence.
                </p>
                <button onClick={handleReport} disabled={generating || loading}
                  className="btn-primary py-2 text-xs mt-1">
                  {generating
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                    : <><Sparkles className="w-3 h-3" /> Generate Now</>
                  }
                </button>
              </div>
            )
          }
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
