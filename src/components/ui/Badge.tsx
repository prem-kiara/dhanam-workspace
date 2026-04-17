import { cn } from "@/lib/utils";
import { TaskStatus, TaskPriority, DiaryTag } from "@/types";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<TaskStatus, string> = {
  "To Do":       "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-50 text-blue-700",
  "In Review":   "bg-amber-50 text-amber-700",
  "Done":        "bg-emerald-50 text-emerald-700",
};
const STATUS_DOT: Record<TaskStatus, string> = {
  "To Do":       "bg-slate-400",
  "In Progress": "bg-blue-500",
  "In Review":   "bg-amber-500",
  "Done":        "bg-emerald-500",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", STATUS_STYLES[status])}>
      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status])} />
      {status}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<TaskPriority, string> = {
  High:   "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low:    "bg-slate-50 text-slate-500",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_STYLES[priority])}>
      {priority}
    </span>
  );
}

// ─── Diary Tag Badge ──────────────────────────────────────────────────────────
const TAG_STYLES: Record<DiaryTag, string> = {
  "Team Sync":  "bg-violet-100 text-violet-700",
  "Client Call":"bg-amber-100 text-amber-700",
  "Strategy":   "bg-teal-100 text-teal-700",
  "Personal":   "bg-blue-100 text-blue-700",
};
const TAG_BORDER: Record<DiaryTag, string> = {
  "Team Sync":  "border-violet-400",
  "Client Call":"border-amber-400",
  "Strategy":   "border-teal-400",
  "Personal":   "border-blue-400",
};

export function DiaryTagBadge({ tag }: { tag: DiaryTag }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", TAG_STYLES[tag])}>
      {tag}
    </span>
  );
}

export function diaryTagBorderClass(tag: DiaryTag): string {
  return TAG_BORDER[tag];
}

// ─── Notification channel pills ───────────────────────────────────────────────
export function ChannelPills() {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <span className="text-xs px-2 py-1 bg-violet-50 text-violet-600 rounded-lg font-medium">✉️ Auto email</span>
      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium">🔔 In-app</span>
    </div>
  );
}
