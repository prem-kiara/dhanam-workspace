"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import type { Notification } from "@/types";

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

type Filter = "All" | "Unread" | "Mentions" | "Workspace";

interface Props {
  onClose: () => void;
}

export function AllNotificationsDrawer({ onClose }: Props) {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead } = useRealtimeNotifications();
  const [filter, setFilter] = useState<Filter>("All");

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "Unread":    return notifications.filter((n) => !n.read);
      case "Mentions":  return notifications.filter((n) => n.type === "comment");
      case "Workspace": return notifications.filter((n) => n.type === "workspace_invite" || n.workspace_id);
      default:          return notifications;
    }
  }, [notifications, filter]);

  const handleClick = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    onClose();
    router.push("/tasks");
  };

  // Group by day (Today / Yesterday / earlier date)
  const grouped = useMemo(() => {
    const now       = new Date();
    const today     = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    const groups: { label: string; items: Notification[] }[] = [];

    for (const n of filtered) {
      const d   = new Date(n.created_at);
      const key = d.toDateString();
      const label = key === today
        ? "Today"
        : key === yesterday
        ? "Yesterday"
        : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const last = groups[groups.length - 1];
      if (last?.label === label) last.items.push(n);
      else groups.push({ label, items: [n] });
    }
    return groups;
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] lg:w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">All Notifications</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-slate-600 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-5 py-3 border-b border-slate-100 flex gap-1.5 flex-wrap flex-shrink-0">
          {(["All", "Unread", "Mentions", "Workspace"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                filter === f
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              {f}
              {f === "Unread" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] bg-red-500 text-white rounded-full font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <div className="text-4xl mb-2">🔔</div>
              Nothing to show here.
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <p className="sticky top-0 bg-slate-50 border-b border-slate-100 px-5 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {group.label}
                </p>
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 flex gap-3 items-start ${
                      !n.read ? "bg-violet-50/40" : ""
                    }`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {TYPE_ICON[n.type] ?? "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[11px] text-slate-300 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        {n.sender_name && <span className="ml-1.5">· {n.sender_name}</span>}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 bg-violet-500 rounded-full mt-2 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
