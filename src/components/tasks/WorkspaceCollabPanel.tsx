"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";
import type { Task, TaskComment, TaskActivity, TaskStatus, Profile } from "@/types";

interface Props {
  task:          Task;
  currentUser:   Profile | null;
  onStatusSave:  (status: TaskStatus) => Promise<void>;
  onRefresh:     () => void;
}

const STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Done"];

const STATUS_STYLES: Record<TaskStatus, string> = {
  "To Do":       "border-slate-200 text-slate-600  hover:border-slate-400",
  "In Progress": "border-blue-200  text-blue-700   hover:border-blue-400",
  "In Review":   "border-amber-200 text-amber-700  hover:border-amber-400",
  "Done":        "border-emerald-200 text-emerald-700 hover:border-emerald-400",
};

const STATUS_ACTIVE: Record<TaskStatus, string> = {
  "To Do":       "border-slate-400  bg-slate-100  text-slate-700",
  "In Progress": "border-blue-400   bg-blue-50    text-blue-700",
  "In Review":   "border-amber-400  bg-amber-50   text-amber-700",
  "Done":        "border-emerald-400 bg-emerald-50 text-emerald-700",
};

const ACTION_ICON: Record<string, string> = {
  created:        "✨",
  status_changed: "📊",
  reassigned:     "🔄",
  commented:      "💬",
  completed:      "✅",
  reopened:       "🔁",
};

export function WorkspaceCollabPanel({ task, currentUser, onStatusSave, onRefresh }: Props) {
  const [tab,           setTab]           = useState<"comments" | "activity">("comments");
  const [comments,      setComments]      = useState<TaskComment[]>([]);
  const [activity,      setActivity]      = useState<TaskActivity[]>([]);
  const [newComment,    setNewComment]    = useState("");
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [sending,       setSending]       = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const canChangeStatus =
    !currentUser ||
    currentUser.id === task.assignee_id ||
    currentUser.id === task.created_by;

  // Fetch comments
  useEffect(() => {
    fetch(`/api/tasks/${task.id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []));
  }, [task.id]);

  // Fetch activity
  useEffect(() => {
    if (tab !== "activity") return;
    fetch(`/api/tasks/${task.id}/activity`)
      .then((r) => r.json())
      .then((data) => setActivity(Array.isArray(data) ? data : []));
  }, [task.id, tab]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Reset pending status when task updates externally
  useEffect(() => {
    setPendingStatus(null);
  }, [task.status]);

  const handleSaveStatus = async () => {
    if (!pendingStatus) return;
    setSaving(true);
    await onStatusSave(pendingStatus);
    setSaving(false);
    setPendingStatus(null);
    onRefresh();
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: newComment.trim() }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Status Staging ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STATUSES.map((s) => {
            const isCurrent = !pendingStatus && task.status === s;
            const isPending = pendingStatus === s;
            return (
              <button
                key={s}
                onClick={() => canChangeStatus ? setPendingStatus(s === task.status && !pendingStatus ? null : s) : undefined}
                disabled={!canChangeStatus}
                className={`text-xs px-2 py-1.5 rounded-lg border font-medium transition-all ${
                  isCurrent || isPending
                    ? STATUS_ACTIVE[s]
                    : `${STATUS_STYLES[s]} bg-white`
                } ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {!canChangeStatus && (
          <p className="text-[10px] text-slate-400 mt-1">Only the assignee can change status</p>
        )}
        {pendingStatus && pendingStatus !== task.status && (
          <button
            onClick={handleSaveStatus}
            disabled={saving}
            className="mt-2 w-full text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg py-1.5 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : `Save Status → ${pendingStatus}`}
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-slate-100">
        {(["comments", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs py-2 font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-violet-500 text-violet-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t === "comments" ? `💬 Comments (${comments.length})` : `📋 Activity`}
          </button>
        ))}
      </div>

      {/* ── Comments ───────────────────────────────────────────── */}
      {tab === "comments" && (
        <div className="flex flex-col gap-2">
          <div className="max-h-56 overflow-y-auto flex flex-col gap-2 pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-300 text-center py-4">No comments yet</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {c.author && <Avatar profile={c.author as any} size="xs" />}
                    <span className="text-xs font-semibold text-slate-700">{c.author_name}</span>
                    <span className="text-[10px] text-slate-300 ml-auto">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.content ?? c.text}</p>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Add comment */}
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendComment()}
              placeholder="Add a comment…"
              className="flex-1 text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button
              onClick={handleSendComment}
              disabled={sending || !newComment.trim()}
              className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-3 py-2 rounded-xl disabled:opacity-50 transition-colors"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* ── Activity ───────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
          {activity.length === 0 ? (
            <p className="text-xs text-slate-300 text-center py-4">No activity yet</p>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="flex gap-2 items-start">
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {ACTION_ICON[a.action] ?? "•"}
                </span>
                <div className="flex-1">
                  <span className="text-xs font-medium text-slate-700">{a.actor_name}</span>
                  {" "}
                  <span className="text-xs text-slate-500">{a.detail ?? a.action}</span>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
