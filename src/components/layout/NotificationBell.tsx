"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/types";
import { AllNotificationsDrawer } from "./AllNotificationsDrawer";

const TYPE_ICON: Record<string, string> = {
  task_assigned:    "👤",
  assign:           "👤",
  reassigned:       "🔄",
  reassign:         "🔄",
  status_changed:   "📊",
  status:           "📊",
  task_completed:   "✅",
  completed:        "✅",
  comment:          "💬",
  workspace_invite: "🗂",
  email:            "✉️",
};

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useRealtimeNotifications();
  const [open,     setOpen]     = useState(false);
  const [drawerOn, setDrawerOn] = useState(false);
  const router = useRouter();
  const ref    = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotifClick = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    router.push("/tasks");
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List (preview of the 8 most recent — full history in drawer) */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 flex gap-3 items-start ${
                    !n.read ? "bg-violet-50" : ""
                  }`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug line-clamp-1 ${!n.read ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[10px] text-slate-300 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer: See all → opens drawer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 flex justify-center">
              <button
                onClick={() => { setOpen(false); setDrawerOn(true); }}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                See all notifications →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full-history drawer */}
      {drawerOn && (
        <AllNotificationsDrawer onClose={() => setDrawerOn(false)} />
      )}
    </div>
  );
}
