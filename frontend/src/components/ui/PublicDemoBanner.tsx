"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

const STORAGE_KEY = "ct-public-demo-banner-dismissed";

export default function PublicDemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-2.5 px-4 sm:px-6 py-2 bg-brand-orange-50 border-b border-brand-orange/20">
      <Info className="w-4 h-4 text-brand-orange shrink-0" />
      <p className="flex-1 text-xs sm:text-[13px] font-medium leading-snug text-brand-charcoal-light">
        You&apos;re viewing a live public demo with sample data. Destructive actions are disabled, and data resets periodically.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="p-1 -mr-1 rounded-md text-brand-muted hover:text-brand-charcoal hover:bg-brand-orange-100 transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
