import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT = {
  indigo:  { bg: "bg-brand-orange-50",  icon: "text-brand-orange",  ring: "ring-brand-orange/25"  },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-200" },
  amber:   { bg: "bg-brand-yellow-light",   icon: "text-brand-yellow",   ring: "ring-brand-yellow/30"   },
  violet:  { bg: "bg-brand-orange-50",  icon: "text-brand-orange",  ring: "ring-brand-orange/25"  },
  slate:   { bg: "bg-brand-surface",  icon: "text-brand-charcoal-light",   ring: "ring-brand-border"   },
};

interface Props {
  title:    string;
  value:    string;
  subtitle?: string;
  icon:     LucideIcon;
  accent?:  keyof typeof ACCENT;
  trend?:   { label: string; positive: boolean };
}

export default function StatCard({
  title, value, subtitle, icon: Icon,
  accent = "indigo", trend,
}: Props) {
  const a = ACCENT[accent];
  return (
    <div className="card p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
      <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ring-1 shrink-0", a.bg, a.ring)}>
        <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", a.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wider truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-black text-brand-charcoal tabular-nums leading-tight mt-0.5 break-words">{value}</p>
        {subtitle && <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={cn("text-[11px] font-semibold mt-1", trend.positive ? "text-emerald-600" : "text-brand-yellow")}>
            {trend.positive ? "↑" : "↓"} {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
