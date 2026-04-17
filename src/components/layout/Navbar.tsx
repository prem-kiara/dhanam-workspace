"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { ManageWorkspacesModal } from "./ManageWorkspacesModal";
import { AllNotificationsDrawer } from "./AllNotificationsDrawer";
import { cn } from "@/lib/utils";

// Settings lives in the avatar dropdown (and the mobile drawer below) — kept off
// the primary tab strip so the nav matches the simplified two-tab mock.
const TABS = [
  { id: "diary", label: "📓 Diary",      href: "/" },
  { id: "tasks", label: "📋 Task Board", href: "/tasks" },
];

export function Navbar() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [mobileNav,      setMobileNav]      = useState(false);
  const [showManageWs,   setShowManageWs]   = useState(false);
  const [showAllNotifs,  setShowAllNotifs]  = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Request browser notification permission on first sign-in
  useEffect(() => {
    if (!session) return;
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [session]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center gap-4 shadow-sm sticky top-0 z-40 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0 border-r border-slate-200 pr-4 mr-1">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">D</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-slate-800 text-sm">Dhanam</span>
            <span className="text-slate-400 text-xs font-medium ml-1">Workspace</span>
          </div>
        </div>

        {/* Desktop nav tabs */}
        <nav className="hidden sm:flex gap-0 h-full">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "px-4 h-full flex items-center text-sm font-medium border-b-2 transition-colors",
                isActive(tab.href)
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />

          {/* Sign out — always visible on desktop */}
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 font-medium"
          >
            ↩ Sign out
          </button>

          {/* User avatar with dropdown (name + settings link on mobile) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(!menuOpen); setMobileNav(false); }}
              className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-violet-700 transition-colors"
              title={session?.user?.name ?? "Account"}
            >
              {initials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 bg-white rounded-xl border border-slate-200 shadow-xl py-1 w-56 z-50">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                </div>

                <button
                  onClick={() => { setShowManageWs(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  🗂 Manage Workspaces
                </button>

                <button
                  onClick={() => { setShowAllNotifs(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  🔔 All Notifications
                </button>

                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  ⚙️ Settings
                </Link>

                <div className="h-px bg-slate-100 my-1" />

                {/* Sign out in dropdown too (for mobile / quick access) */}
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors font-medium"
                >
                  ↩ Sign out
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
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => setMobileNav(false)}
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 text-sm font-medium border-l-4 transition-colors",
                isActive(tab.href)
                  ? "border-violet-600 text-violet-700 bg-violet-50"
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </Link>
          ))}
          {/* Settings lives here on mobile so phone users can reach it without opening the avatar dropdown. */}
          <Link
            href="/settings"
            onClick={() => setMobileNav(false)}
            className={cn(
              "flex items-center gap-3 px-5 py-3.5 text-sm font-medium border-l-4 transition-colors",
              isActive("/settings")
                ? "border-violet-600 text-violet-700 bg-violet-50"
                : "border-transparent text-slate-600 hover:bg-slate-50"
            )}
          >
            ⚙️ Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium border-l-4 border-transparent text-red-500 hover:bg-red-50 w-full text-left"
          >
            ↩ Sign out
          </button>
        </div>
      )}

      {/* Manage Workspaces modal */}
      {showManageWs && (
        <ManageWorkspacesModal onClose={() => setShowManageWs(false)} />
      )}

      {/* All Notifications drawer */}
      {showAllNotifs && (
        <AllNotificationsDrawer onClose={() => setShowAllNotifs(false)} />
      )}
    </>
  );
}
