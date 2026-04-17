"use client";

import { useState, useEffect, useRef } from "react";
import { Notification } from "@/types";
import { timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "next-auth/react";

const ICON: Record<string, string> = {
  assign:   "👤",
  reassign: "🔄",
  comment:  "💬",
  status:   "📋",
  email:    "✉️",
  whatsapp: "💬",
};

export function NotificationBell() {
  const { data: session } = useSession();
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Initial fetch
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchNotifs();

    // Real-time subscription
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        setNotifs((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function fetchNotifs() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session!.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifs(data as Notification[]);
  }

  async function markAllRead() {
    if (!session?.user?.id) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", session.user.id)
      .eq("read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markOneRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
      >
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-700">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-violet-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No notifications yet</p>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markOneRead(n.id)}
                  className={`w-full px-4 py-3 flex gap-3 items-start border-b border-slate-50 text-left hover:bg-slate-50 transition-colors ${!n.read ? "bg-violet-50" : ""}`}
                >
                  <span className="text-base mt-0.5 flex-shrink-0">{ICON[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!n.read ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 text-center border-t border-slate-100">
            <button className="text-xs text-violet-600 hover:underline">View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
}
