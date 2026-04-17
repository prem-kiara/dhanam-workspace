"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow, isPast, parseISO } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";
import { WorkspaceCollabPanel } from "@/components/tasks/WorkspaceCollabPanel";
import type { Task, TaskPriority, TaskStatus, Profile } from "@/types";

const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  High:   "bg-red-500",
  Medium: "bg-amber-500",
  Low:    "bg-slate-300",
};
const PRIORITY_BADGE: Record<TaskPriority, string> = {
  High:   "bg-red-50 text-red-600 border border-red-200",
  Medium: "bg-amber-50 text-amber-600 border border-amber-200",
  Low:    "bg-slate-50 text-slate-500 border border-slate-200",
};
const STATUS_BADGE: Record<TaskStatus, string> = {
  "To Do":       "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-50 text-blue-700",
  "In Review":   "bg-amber-50 text-amber-700",
  "Done":        "bg-emerald-50 text-emerald-700",
};

type FilterType = "All" | "Pending" | "Completed";

export function PersonalTaskManager() {
  const { data: session } = useSession();
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [filter,      setFilter]      = useState<FilterType>("Pending");
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [profile,     setProfile]     = useState<Profile | null>(null);

  // Add task form
  const [newTitle,    setNewTitle]    = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("Medium");
  const [newDueDate,  setNewDueDate]  = useState("");
  const [adding,      setAdding]      = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/tasks?personal=true");
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchTasks();
    fetch("/api/profiles/me").then((r) => r.json()).then(setProfile);
  }, [session, fetchTasks]);

  const filtered = tasks.filter((t) => {
    if (filter === "Pending")   return !t.completed && t.status !== "Done";
    if (filter === "Completed") return t.completed  || t.status === "Done";
    return true;
  });

  const overdueCount = tasks.filter(
    (t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== "Done"
  ).length;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        title:    newTitle.trim(),
        priority: newPriority,
        due_date: newDueDate || undefined,
      }),
    });
    if (res.ok) {
      setNewTitle("");
      setNewPriority("Medium");
      setNewDueDate("");
      fetchTasks();
    }
    setAdding(false);
  };

  const handleToggleComplete = async (task: Task) => {
    const done = task.status === "Done";
    await fetch(`/api/tasks/${task.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        status:    done ? "To Do" : "Done",
        completed: !done,
      }),
    });
    fetchTasks();
  };

  const handleStatusSave = async (task: Task, status: TaskStatus) => {
    await fetch(`/api/tasks/${task.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    fetchTasks();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Stats row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",     value: tasks.length,                                             color: "text-slate-700" },
          { label: "Pending",   value: tasks.filter((t) => t.status !== "Done").length,          color: "text-blue-700"  },
          { label: "Overdue",   value: overdueCount,                                              color: overdueCount > 0 ? "text-red-600" : "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Add task form ─────────────────────────────────────────── */}
      <form onSubmit={handleAddTask} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add Task</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Priority */}
          <div className="flex gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNewPriority(p)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  newPriority === p ? PRIORITY_BADGE[p] : "border-slate-200 text-slate-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Due date */}
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="ml-auto text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-4 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
      </form>

      {/* ── Filter tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1">
        {(["All", "Pending", "Completed"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              filter === f
                ? "bg-slate-700 text-white border-slate-700"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Task list ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {filter === "Pending" ? "No pending tasks. " : ""}
          {filter === "Completed" ? "No completed tasks yet." : ""}
          {filter === "All" ? "No tasks yet. Add one above!" : ""}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => {
            const isDone    = task.status === "Done" || task.completed;
            const isOverdue = task.due_date && !isDone && isPast(parseISO(task.due_date));
            const expanded  = expandedId === task.id;

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Task row */}
                <div
                  className="flex items-start gap-3 p-3.5 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : task.id)}
                >
                  {/* Priority strip */}
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />

                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isDone ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-violet-400"
                    }`}
                  >
                    {isDone && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[task.status]}`}>
                        {task.status}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className={`text-[10px] font-medium ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                          {isOverdue ? "⚠ OVERDUE" : ""} Due {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {task.assignee && (
                    <div className="flex-shrink-0">
                      <Avatar profile={task.assignee} size="sm" />
                    </div>
                  )}

                  <button className="text-slate-300 hover:text-slate-500 ml-1 flex-shrink-0 text-lg leading-none" onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : task.id); }}>
                    {expanded ? "▲" : "▼"}
                  </button>
                </div>

                {/* Expanded panel */}
                {expanded && (
                  <div className="border-t border-slate-100 p-4">
                    <WorkspaceCollabPanel
                      task={task}
                      currentUser={profile}
                      onStatusSave={(status) => handleStatusSave(task, status)}
                      onRefresh={fetchTasks}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
