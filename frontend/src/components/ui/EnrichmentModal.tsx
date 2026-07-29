"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, CheckCircle2, Loader2, X, Sparkles } from "lucide-react";
import { leadsApi } from "@/lib/api";
import { capitalize } from "@/lib/utils";
import type { Lead } from "@/types";

interface Props {
  lead: Pick<Lead, "id" | "name" | "company" | "title" | "industry">;
  onComplete: (updated: Lead) => void;
  onError:    () => void;
}

export default function EnrichmentModal({ lead, onComplete, onError }: Props) {
  const steps = [
    `Searching database for ${lead.company}…`,
    `Analyzing ${lead.industry} market signals…`,
    `Evaluating ${lead.title}'s procurement authority…`,
    "Compiling ICP intelligence profile…",
  ];

  const [stepIdx,   setStepIdx]   = useState(0);
  const [apiDone,   setApiDone]   = useState(false);
  const [result,    setResult]    = useState<Lead | null>(null);
  const [complete,  setComplete]  = useState(false);
  const [failed,    setFailed]    = useState(false);
  const completeFired = useRef(false);

  // Fire API call once on mount
  useEffect(() => {
    leadsApi.enrich(lead.id)
      .then(r  => { setResult(r); setApiDone(true); })
      .catch(() => { setFailed(true); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance through steps
  useEffect(() => {
    if (stepIdx >= steps.length - 1 || complete) return;
    const t = setTimeout(() => setStepIdx(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [stepIdx, complete, steps.length]);

  // When last step AND API done → show complete → close
  useEffect(() => {
    if (completeFired.current) return;
    if (stepIdx >= steps.length - 1 && apiDone && result) {
      completeFired.current = true;
      setTimeout(() => {
        setComplete(true);
        setTimeout(() => onComplete(result), 1000);
      }, 250);
    }
  }, [stepIdx, apiDone, result, steps.length, onComplete]);

  // API failed
  useEffect(() => {
    if (failed) { setTimeout(onError, 400); }
  }, [failed, onError]);

  const icp = result?.icp_fit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/45 backdrop-blur-[3px]"
      style={{ animation: "fadeIn 0.15s ease" }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-brand-border w-full max-w-sm overflow-hidden mx-auto"
        style={{ animation: "slideUp 0.18s ease" }}>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-6 pb-5 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center shrink-0">
              {complete
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : <Brain className="w-5 h-5 text-white" />
              }
            </div>
            <div>
              <p className="font-black text-zinc-900 text-sm">
                {complete ? "Enrichment Complete" : "AI Enriching Lead"}
              </p>
              <p className="text-[11px] text-zinc-500">{lead.name} · {lead.company}</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-4">
          {steps.map((step, i) => {
            const done    = i < stepIdx || (i === stepIdx && complete);
            const active  = i === stepIdx && !complete;
            const waiting = i > stepIdx && !complete;

            return (
              <div key={i} className="flex items-center gap-3">
                <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                  {done
                    ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" style={{ width: 18, height: 18 }} />
                    : active
                    ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    : <div className="w-4 h-4 rounded-full border-2 border-zinc-200" />
                  }
                </div>
                <p className={`text-sm transition-all ${
                  done    ? "text-zinc-400 line-through"     :
                  active  ? "text-zinc-900 font-semibold"    :
                  waiting ? "text-zinc-300"                  : "text-zinc-400"
                }`}>
                  {step}
                </p>
              </div>
            );
          })}
        </div>

        {/* Result */}
        {complete && result && (
          <div className="px-6 pb-6 space-y-2" style={{ animation: "fadeSlideIn 0.3s ease both" }}>
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              icp === "high"   ? "bg-emerald-50 border-emerald-200" :
              icp === "medium" ? "bg-amber-50 border-amber-200"     :
                                 "bg-zinc-50 border-zinc-200"
            }`}>
              <Sparkles className={`w-4 h-4 shrink-0 ${
                icp === "high" ? "text-emerald-600" : icp === "medium" ? "text-amber-600" : "text-zinc-400"
              }`} />
              <div>
                <p className={`text-xs font-bold ${
                  icp === "high" ? "text-emerald-700" : icp === "medium" ? "text-amber-700" : "text-zinc-600"
                }`}>
                  ICP Fit: {icp ? capitalize(icp) : "Unknown"}
                </p>
                {result.ai_summary && (
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug line-clamp-2">{result.ai_summary}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {failed && (
          <div className="px-6 pb-5">
            <p className="text-xs text-red-500 font-semibold">Enrichment failed — please try again</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(-10px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
