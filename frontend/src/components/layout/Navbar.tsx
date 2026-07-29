"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Mail,
  BarChart2,
  Menu,
  X,
} from "lucide-react";
import ctLogo from "@/assets/ct logo.png";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline",  label: "Pipeline",  icon: GitBranch       },
  { href: "/leads",     label: "Leads",     icon: Users           },
  { href: "/outreach",  label: "Outreach",  icon: Mail            },
  { href: "/analytics", label: "Analytics", icon: BarChart2       },
];

function NavLinks({ path, onClose }: { path: string; onClose?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      <p className="px-3 mb-2 text-[10px] font-semibold text-brand-muted uppercase tracking-widest">
        Menu
      </p>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-brand-orange-50 text-brand-orange"
                : "text-brand-charcoal-light hover:bg-brand-surface hover:text-brand-charcoal"
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 transition-colors ${
                active ? "text-brand-orange" : "text-brand-muted group-hover:text-brand-charcoal-light"
              }`}
            />
            <span className="flex-1">{label}</span>
            {active && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBottom() {
  return (
    <div className="px-4 py-4 border-t border-brand-border">
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center text-[11px] font-bold text-white shrink-0">
          S
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-charcoal truncate">Sales Admin</p>
          <p className="text-[10px] text-brand-muted truncate">Sales Team</p>
        </div>
      </div>
    </div>
  );
}

function LogoBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "px-5 py-4 border-b border-brand-border"}>
      <div
        className="overflow-hidden relative shrink-0"
        style={{ width: compact ? "100px" : "126px", height: compact ? "22px" : "28px" }}
      >
        <Image
          src={ctLogo}
          alt="CodeThread"
          width={350}
          height={350}
          className="absolute"
          style={{
            top: compact ? "-36px" : "-45px",
            left: compact ? "-4px" : "-5px",
            ...(compact ? { width: "280px", height: "280px" } : {}),
          }}
          priority
        />
      </div>
      {!compact && (
        <p className="text-[10px] text-brand-muted mt-1.5 font-medium uppercase tracking-widest">
          Lead to Deal Agent
        </p>
      )}
    </div>
  );
}

export default function Navbar() {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-brand-border flex-col">
        <LogoBlock />
        <NavLinks path={path} />
        <SidebarBottom />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-white/95 backdrop-blur-sm border-b border-brand-border flex items-center px-4 gap-3"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-lg text-brand-charcoal-light hover:bg-brand-orange-50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <LogoBlock compact />
        <span className="text-[10px] text-brand-muted font-medium uppercase tracking-widest truncate ml-auto">
          Lead to Deal
        </span>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          <div
            className="absolute inset-0 bg-brand-charcoal/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="relative z-10 w-[min(288px,88vw)] bg-white flex flex-col h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <div className="overflow-hidden relative shrink-0" style={{ width: "126px", height: "28px" }}>
                <Image
                  src={ctLogo}
                  alt="CodeThread"
                  width={350}
                  height={350}
                  className="absolute"
                  style={{ top: "-45px", left: "-5px" }}
                  priority
                />
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-brand-muted hover:bg-brand-orange-50 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavLinks path={path} onClose={() => setMobileOpen(false)} />
            <SidebarBottom />
          </aside>
        </div>
      )}
    </>
  );
}
