"use client";

import { Task } from "@/types";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDueDate, cn } from "@/lib/utils";

interface Props {
  task:       Task;
  isSelected: boolean;
  onClick:    () => void;
}

export function TaskCard({ task, isSelected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border p-3.5 cursor-pointer group transition-all hover:shadow-md",
        isSelected
          ? "border-violet-400 shadow-md"
          : "border-slate-200 hover:border-violet-200"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-slate-700 font-medium leading-snug group-hover:text-violet-700 transition-colors">
          {task.title}
        </p>
        {task.assignee && (
          <Avatar profile={task.assignee} size="sm" className="flex-shrink-0" />
        )}
      </div>

      {task.subsubcategory && (
        <p className="text-xs text-slate-400 mb-1.5">↳ {task.subsubcategory.name}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge   status={task.status}   />
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className="text-xs text-slate-400 ml-auto">Due {formatDueDate(task.due_date)}</span>
        )}
        {task._comment_count != null && task._comment_count > 0 && (
          <span className="text-xs text-slate-400">💬 {task._comment_count}</span>
        )}
      </div>
    </div>
  );
}
