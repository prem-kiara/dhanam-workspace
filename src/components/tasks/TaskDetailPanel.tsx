"use client";

import { useState } from "react";
import { Task, TaskStatus, Profile, TaskComment, UpdateTaskPayload } from "@/types";
import { StatusBadge, PriorityBadge, ChannelPills } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDueDate, formatDate, timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "next-auth/react";

const STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Done"];

interface Props {
  task:         Task;
  allProfiles:  Profile[];
  onClose:      () => void;
  onUpdate:     (id: string, payload: UpdateTaskPayload, newAssignee?: Profile) => void;
}

export function TaskDetailPanel({ task, allProfiles, onClose, onUpdate }: Props) {
  const { data: session } = useSession();
  const supabase = createClient();
  const [comment,      setComment]      = useState("");
  const [postingCmt,   setPostingCmt]   = useState(false);
  const [localComments, setLocalComments] = useState<TaskComment[]>(task.comments ?? []);

  const handleStatusChange = (status: TaskStatus) => {
    onUpdate(task.id, { status });
  };

  const handleReassign = (profile: Profile) => {
    if (profile.id === task.assignee_id) return;
    onUpdate(task.id, { assignee_id: profile.id }, profile);
  };

  const postComment = async () => {
    if (!comment.trim() || !session?.user?.id) return;
    setPostingCmt(true);
    const { data } = await supabase
      .from("task_comments")
      .insert({ task_id: task.id, author_id: session.user.id, content: comment.trim() })
      .select("*, author:profiles(id, name, initials, color, avatar_url, email, phone, created_at)")
      .single();
    if (data) {
      setLocalComments((prev) => [...prev, data as TaskComment]);
      setComment("");
    }
    setPostingCmt(false);
  };

  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-medium truncate">
            {task.category?.name}
            {task.subcategory && ` / ${task.subcategory.name}`}
            {task.subsubcategory && ` / ${task.subsubcategory.name}`}
          </p>
          <h3 className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{task.title}</h3>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 text-xl leading-none mt-0.5 flex-shrink-0">×</button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Status + Due */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Status</p>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Due Date</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{formatDueDate(task.due_date) ?? "Not set"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Assignee</p>
            <div className="flex items-center gap-1.5">
              {task.assignee
                ? <><Avatar profile={task.assignee} size="sm" /><span className="text-xs font-medium text-slate-700">{task.assignee.name}</span></>
                : <span className="text-xs text-slate-400">Unassigned</span>
              }
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Priority</p>
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Reassign */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Reassign to</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {allProfiles.map((p) => (
              <button
                key={p.id}
                title={p.name}
                onClick={() => handleReassign(p)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all ${p.color} ${
                  p.id === task.assignee_id ? "ring-2 ring-offset-1 ring-violet-500" : "opacity-50 hover:opacity-100"
                }`}
              >
                {p.initials}
              </button>
            ))}
          </div>
          <ChannelPills />
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Description</p>
            <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Comments */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Collaboration ({localComments.length})</p>
          <div className="flex flex-col gap-2">
            {localComments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No comments yet.</p>
            ) : (
              localComments.map((c) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    {c.author && <Avatar profile={c.author} size="xs" />}
                    <span className="text-xs font-medium text-slate-600">{c.author?.name ?? "Team member"}</span>
                    <span className="text-xs text-slate-400 ml-auto">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Comment input — pinned at bottom */}
      <div className="p-4 border-t border-slate-100 flex gap-2 flex-shrink-0">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && postComment()}
          placeholder="Add a comment…"
          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <button
          onClick={postComment}
          disabled={postingCmt || !comment.trim()}
          className="bg-violet-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
