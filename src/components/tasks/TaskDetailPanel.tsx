"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Task, TaskStatus, Profile, UpdateTaskPayload } from "@/types";
import { PriorityBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { WorkspaceCollabPanel } from "@/components/tasks/WorkspaceCollabPanel";
import { NotifyModal } from "@/components/tasks/NotifyModal";
import { formatDueDate } from "@/lib/utils";

interface Props {
  task:          Task;
  allProfiles:   Profile[];
  onClose:       () => void;
  onUpdate:      (id: string, payload: UpdateTaskPayload, newAssignee?: Profile) => void;
  onRefresh?:    () => void;
}

export function TaskDetailPanel({ task, allProfiles, onClose, onUpdate, onRefresh }: Props) {
  const { data: session } = useSession();
  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [notifyAssignee, setNotifyAssignee] = useState<Profile | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profiles/me").then((r) => r.json()).then(setProfile);
  }, [session]);

  const handleReassign = (p: Profile) => {
    if (p.id === task.assignee_id) return;
    // Open notify modal so user can pick channels
    setNotifyAssignee(p);
  };

  const handleNotifyConfirm = async (
    newAssignee: Profile,
    channels: { email: boolean; inapp: boolean; whatsapp: boolean }
  ) => {
    setNotifyAssignee(null);
    onUpdate(task.id, {
      assignee_id:    newAssignee.id,
      notify_channels: channels,
    }, newAssignee);
    onRefresh?.();
  };

  const handleStatusSave = async (status: TaskStatus) => {
    onUpdate(task.id, { status });
    onRefresh?.();
  };

  const breadcrumb = [
    task.category_obj?.name ?? task.category,
    task.subcategory?.name  ?? task.sub,
    task.subsubcategory?.name ?? task.subsub,
  ].filter(Boolean).join(" / ");

  return (
    <>
      <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            {breadcrumb && (
              <p className="text-xs text-slate-400 font-medium truncate mb-1">{breadcrumb}</p>
            )}
            <h3 className="text-sm font-semibold text-slate-800 leading-snug">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-slate-600 text-xl leading-none mt-0.5 flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Due Date</p>
              <p className="text-xs font-medium text-slate-700">{formatDueDate(task.due_date) ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Priority</p>
              <PriorityBadge priority={task.priority} />
            </div>
          </div>

          {/* Assignee display */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Assigned to</p>
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <>
                  <Avatar profile={task.assignee} size="sm" />
                  <span className="text-xs font-medium text-slate-700">{task.assignee.name}</span>
                </>
              ) : task.assignee_name ? (
                <span className="text-xs font-medium text-slate-700">{task.assignee_name}</span>
              ) : (
                <span className="text-xs text-slate-400">Unassigned</span>
              )}
            </div>
          </div>

          {/* Reassign to workspace members */}
          {allProfiles.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Reassign to</p>
              <div className="flex gap-2 flex-wrap">
                {allProfiles.map((p) => (
                  <button
                    key={p.id}
                    title={p.name}
                    onClick={() => handleReassign(p)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all ${p.color} ${
                      p.id === task.assignee_id
                        ? "ring-2 ring-offset-1 ring-violet-500"
                        : "opacity-50 hover:opacity-100"
                    }`}
                  >
                    {p.initials}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description / notes */}
          {(task.description || task.notes) && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Notes</p>
              <p className="text-xs text-slate-600 leading-relaxed">{task.description ?? task.notes}</p>
            </div>
          )}

          {/* Collab panel — status + comments + activity */}
          <WorkspaceCollabPanel
            task={task}
            currentUser={profile}
            onStatusSave={handleStatusSave}
            onRefresh={onRefresh ?? (() => {})}
          />
        </div>
      </div>

      {/* Notify modal on reassign */}
      {notifyAssignee && (
        <NotifyModal
          assignee={notifyAssignee}
          task={task}
          onConfirm={(ch) => handleNotifyConfirm(notifyAssignee, ch)}
          onClose={() => setNotifyAssignee(null)}
        />
      )}
    </>
  );
}
