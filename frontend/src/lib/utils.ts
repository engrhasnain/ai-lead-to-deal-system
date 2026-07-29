import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  if (score >= 25) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export function icpBadge(icp: string): string {
  if (icp === "high")   return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (icp === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-600 border-red-200";
}

export function stageBadge(stage: string): string {
  const map: Record<string, string> = {
    new:         "bg-brand-surface text-brand-muted border-brand-border",
    qualified:   "bg-brand-orange-50 text-brand-orange border-brand-orange/25",
    proposal:    "bg-brand-surface text-brand-charcoal-light border-brand-border",
    negotiation: "bg-brand-yellow-light text-brand-yellow border-brand-yellow/40",
    won:         "bg-emerald-50 text-emerald-700 border-emerald-200",
    lost:        "bg-brand-surface text-brand-muted border-brand-border",
  };
  return map[stage] ?? "bg-brand-surface text-brand-muted border-brand-border";
}

export function stageBorderColor(stage: string): string {
  const map: Record<string, string> = {
    new:         "border-l-brand-muted",
    qualified:   "border-l-brand-orange",
    proposal:    "border-l-brand-charcoal-light",
    negotiation: "border-l-brand-yellow",
    won:         "border-l-emerald-500",
    lost:        "border-l-brand-muted",
  };
  return map[stage] ?? "border-l-brand-border";
}

export const STAGES: { key: string; label: string; color: string; headerCls: string }[] = [
  { key: "new",         label: "New Lead",    color: "#888888", headerCls: "text-brand-muted border-brand-border"       },
  { key: "qualified",   label: "Qualified",   color: "#F26522", headerCls: "text-brand-orange border-brand-orange/30"   },
  { key: "proposal",    label: "Proposal",    color: "#555555", headerCls: "text-brand-charcoal-light border-brand-border"},
  { key: "negotiation", label: "Negotiation", color: "#F5B800", headerCls: "text-brand-yellow border-brand-yellow/40"   },
  { key: "won",         label: "Won",         color: "#10b981", headerCls: "text-emerald-600 border-emerald-200"        },
  { key: "lost",        label: "Lost",        color: "#888888", headerCls: "text-brand-muted border-brand-border"       },
];
