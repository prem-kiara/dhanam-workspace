"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "diary", label: "📓 Diary",      href: "/diary" },
  { id: "tasks", label: "📋 Task Board", href: "/tasks" },
];

export function Navbar() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [mobileNav,   setMobileNav]   = useState(false);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center gap-4 shadow-sm sticky top-0 z-40 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">D</span>
          </div>
          <span className="font-bold text-slate-800 text-sm">Dhanam</span>
          <span className="text-slate-300 text-xs font-medium ml-0.5 hidden xs:inline">Workspace</span>
        </div>

        {/* Desktop nav tabs */}
        <nav className="hidden sm:flex gap-0 h-full">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "px-4 h-full flex items-center text-sm font-medium border-b-2 transition-colors",
                  active
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: notifications + avatar + hamburger */}
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen(!menuOpen); setMobileNav(false); }}
              className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-violet-700 transition-colors"
            >
              {initials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 bg-white rounded-xl border border-slate-200 shadow-lg py-1 w-48 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => { setMobileNav(!mobileNav); setMenuOpen(false); }}
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileNav ? (
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNav && (
        <div className="sm:hidden bg-white border-b border-slate-200 shadow-sm z-30 sticky top-14">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setMobileNav(false)}
                className={cn(
                  "flex items-center gap-3 px-5 py-3.5 text-sm font-medium border-l-4 transition-colors",
                  active
                    ? "border-violet-600 text-violet-700 bg-violet-50"
                    : "border-transparent text-slate-600 hover:bg-slate-50"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
