"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { isPast, parseISO } from "date-fns";
import { Task, Profile, TaskStatus, Workspace } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { NotifyModal } from "./NotifyModal";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";
import { Avatar } from "@/components/ui/Avatar";
import { OrgPeoplePicker, OrgPerson } from "@/components/ui/OrgPeoplePicker";

type CompletionFilter = "All" | "Pending" | "Completed";

interface PendingNotify { assignee: Profile; taskId: string; taskTitle: string; action: "assign" | "reassign"; }

const COLUMNS: { status: TaskStatus; label: string; color: string; bg: string; dot: string }[] = [
  { status: "To Do",       label: "To Do",       color: "text-slate-600",   bg: "bg-slate-100",   dot: "bg-slate-400"    },
  { status: "In Progress", label: "In Progress", color: "text-blue-700",    bg: "bg-blue-50",     dot: "bg-blue-500"     },
  { status: "In Review",   label: "In Review",   color: "text-amber-700",   bg: "bg-amber-50",    dot: "bg-amber-500"    },
  { status: "Done",        label: "Done",        color: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-500"  },
];

const PRIORITY_STRIP: Record<string, string> = {
  High:   "bg-red-500",
  Medium: "bg-amber-400",
  Low:    "bg-slate-300",
};

// Synthetic id for the "Inbox" bucket that holds legacy tasks with workspace_id = null
// in the rare case a user has no Personal workspace (should not happen after migration).
const ORPHAN_WS_ID = "__orphan__";

export function TaskBoard() {
  const { data: session } = useSession();
  const supabase = createClient();

  // ── Workspaces + tasks + profiles ────────────────────────────────────────
  const [workspaces,     setWorkspaces]     = useState<Workspace[]>([]);
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [profiles,       setProfiles]       = useState<Profile[]>([]);
  const [loading,        setLoading]        = useState(true);

  // ── Selection / UI ───────────────────────────────────────────────────────
  const [selectedTask,     setSelectedTask]     = useState<Task | null>(null);
  const [filterMember,     setFilterMember]     = useState<string | null>(null);
  const [filterStatus,     setFilterStatus]     = useState<TaskStatus | null>(null);
  const [filterCompletion, setFilterCompletion] = useState<CompletionFilter>("All");
  const [collapsedWs,      setCollapsedWs]      = useState<Record<string, boolean>>({});
  const [showAddTask,      setShowAddTask]      = useState(false);
  const [pendingNotify,    setPendingNotify]    = useState<PendingNotify | null>(null);

  // ── Create-workspace modal ───────────────────────────────────────────────
  const [showCreateWs, setShowCreateWs] = useState(false);

  // ── Add task form ────────────────────────────────────────────────────────
  const [addWsId,       setAddWsId]       = useState<string | null>(null); // null = orphan (no workspace)
  const [newTitle,      setNewTitle]      = useState("");
  const [newAssignee,   setNewAssignee]   = useState<OrgPerson | null>(null);
  const [newPriority,   setNewPriority]   = useState("Medium");
  const [newDueDate,    setNewDueDate]    = useState("");
  const [newGroup,      setNewGroup]      = useState("");
  const [newStatus,     setNewStatus]     = useState<TaskStatus>("To Do");
  const [addError,      setAddError]      = useState("");
  const [addSaving,     setAddSaving]     = useState(false);

  // ── Fetch workspaces ─────────────────────────────────────────────────────
  const fetchWorkspaces = useCallback(async () => {
    const res = await fetch("/api/workspace");
    if (!res.ok) return;
    const ws = await res.json();
    if (Array.isArray(ws)) setWorkspaces(ws);
  }, []);

  useEffect(() => { if (session) fetchWorkspaces(); }, [session, fetchWorkspaces]);

  // ── Fetch tasks + profiles (all accessible) ──────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    const wsIds = workspaces.map((w) => w.id);

    const [profilesRes, wsTasksRes, orphanRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      wsIds.length
        ? supabase
            .from("tasks")
            .select("*,assignee:profiles!tasks_assignee_id_fkey(id,name,initials,color,avatar_url,email,phone,created_at)")
            .in("workspace_id", wsIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      // Legacy orphan tasks (null workspace_id) where user is stakeholder
      supabase
        .from("tasks")
        .select("*,assignee:profiles!tasks_assignee_id_fkey(id,name,initials,color,avatar_url,email,phone,created_at)")
        .is("workspace_id", null)
        .or(`created_by.eq.${session.user.id},owner_id.eq.${session.user.id},assignee_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false }),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    const combined = [
      ...((wsTasksRes.data as Task[] | null) ?? []),
      ...((orphanRes.data as Task[] | null) ?? []),
    ];
    setTasks(combined);
    setLoading(false);
  }, [supabase, session?.user?.id, workspaces]);

  useEffect(() => { if (session) fetchAll(); }, [session, fetchAll]);

  // Realtime — refresh on any tasks table change
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("board_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, session, fetchAll]);

  // ── Workspace actions ────────────────────────────────────────────────────
  const handleWorkspaceCreated = (ws: Workspace) => {
    setWorkspaces((prev) => [...prev, ws]);
  };

  const handleDeleteWorkspace = async (ws: Workspace) => {
    if (ws.is_personal) return; // locked
    if (!confirm(`Delete workspace "${ws.name}" and all its tasks?`)) return;
    const res = await fetch(`/api/workspace/${ws.id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
      setTasks((prev) => prev.filter((t) => t.workspace_id !== ws.id));
    }
  };

  const toggleCollapseWs = (id: string) => {
    setCollapsedWs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Task update / delete ─────────────────────────────────────────────────
  const handleUpdate = async (id: string, payload: Partial<Task>, newAssignee?: Profile) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    await supabase.from("tasks").update(payload).eq("id", id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...payload, ...(newAssignee ? { assignee: newAssignee } : {}) } : t));
    setSelectedTask((prev) => prev?.id === id ? { ...prev, ...payload, ...(newAssignee ? { assignee: newAssignee } : {}) } : prev);
    if (newAssignee && payload.assignee_id && payload.assignee_id !== task.assignee_id) {
      setPendingNotify({ assignee: newAssignee, taskId: id, taskTitle: task.title, action: "reassign" });
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  // Inline checkbox toggle — ported from PersonalTaskManager
  const handleToggleComplete = async (task: Task) => {
    const done       = task.status === "Done";
    const nextStatus = done ? "To Do" : "Done";
    await supabase
      .from("tasks")
      .update({ status: nextStatus, completed: !done })
      .eq("id", task.id);
    setTasks((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, status: nextStatus, completed: !done } : t)
    );
  };

  // ── Add task ──────────────────────────────────────────────────────────────
  const openAddTask = (wsId: string | null, status: TaskStatus = "To Do") => {
    setAddWsId(wsId);
    setNewStatus(status);
    setShowAddTask(true);
  };

  const handleAddTask = async () => {
    if (!newTitle.trim()) { setAddError("Title is required."); return; }
    setAddSaving(true); setAddError("");
    const payload: Record<string, unknown> = {
      title:          newTitle.trim(),
      status:         newStatus,
      priority:       newPriority,
      due_date:       newDueDate || null,
      category:       newGroup.trim() || null,
      workspace_id:   addWsId ?? null,
      assignee_id:    newAssignee?.id    ?? null,
      assignee_email: newAssignee?.email ?? null,
      assignee_name:  newAssignee?.name  ?? null,
    };
    const res = await fetch("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAddError(d.error ?? "Failed to create task.");
      setAddSaving(false);
      return;
    }
    setNewTitle(""); setNewAssignee(null); setNewPriority("Medium");
    setNewDueDate(""); setNewGroup(""); setNewStatus("To Do");
    setShowAddTask(false);
    fetchAll();
    setAddSaving(false);
  };

  // ── Notify ────────────────────────────────────────────────────────────────
  const handleSendNotify = async (channels: Record<string, boolean>) => {
    if (!pendingNotify) return;
    await fetch("/api/send-notification", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        assignee_id: pendingNotify.assignee.id,
        task_id:     pendingNotify.taskId,
        task_title:  pendingNotify.taskTitle,
        channels,
        action:      pendingNotify.action,
      }),
    });
    setPendingNotify(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => tasks.filter((t) => {
    if (filterMember && t.assignee_id !== filterMember) return false;
    if (filterStatus && t.status      !== filterStatus) return false;
    const isDone = t.status === "Done" || t.completed;
    if (filterCompletion === "Pending"   && isDone)  return false;
    if (filterCompletion === "Completed" && !isDone) return false;
    return true;
  }), [tasks, filterMember, filterStatus, filterCompletion]);

  const totalDone = tasks.filter((t) => t.status === "Done").length;
  const overdueCount = useMemo(
    () => tasks.filter(
      (t) => t.due_date && t.status !== "Done" && isPast(parseISO(t.due_date))
    ).length,
    [tasks]
  );

  // Tasks grouped by workspace — plus an orphan bucket if there are null-workspace legacy tasks
  const groups = useMemo(() => {
    const personalWs = workspaces.find((w) => w.is_personal);
    const orphanTasks = filtered.filter((t) => !t.workspace_id);

    const byWorkspace = workspaces.map((ws) => {
      let wsTasks = filtered.filter((t) => t.workspace_id === ws.id);
      // Merge orphan legacy tasks into Personal section visually
      if (ws.is_personal) wsTasks = [...wsTasks, ...orphanTasks];
      return { ws, tasks: wsTasks };
    });

    // If no Personal workspace exists but there are orphans, show them under Inbox
    if (!personalWs && orphanTasks.length > 0) {
      byWorkspace.unshift({
        ws: {
          id:          ORPHAN_WS_ID,
          name:        "Inbox",
          created_by:  session?.user?.id ?? "",
          created_at:  new Date().toISOString(),
          is_personal: true, // render as locked
        } as Workspace,
        tasks: orphanTasks,
      });
    }

    return byWorkspace;
  }, [workspaces, filtered, session?.user?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4 lg:gap-6 h-full relative overflow-hidden">

      {/* ── Board column ─────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col gap-3 overflow-y-auto pr-1 min-w-0 ${selectedTask ? "hidden sm:flex" : "flex"}`}>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm flex items-center gap-3 flex-wrap sticky top-0 z-10">

          {/* Assignee filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Assignee:</span>
            <button
              onClick={() => setFilterMember(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${!filterMember ? "bg-slate-700 text-white border-slate-700" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}
            >All</button>
            {profiles.map((p) => (
              <button
                key={p.id}
                title={p.name}
                onClick={() => setFilterMember(filterMember === p.id ? null : p.id)}
                className={`w-7 h-7 ${p.color ?? "bg-violet-500"} rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${filterMember === p.id ? "ring-2 ring-offset-1 ring-violet-600 opacity-100" : "opacity-60 hover:opacity-100"}`}
              >
                {(p.initials ?? p.name?.slice(0, 2) ?? "?").toUpperCase()}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200" />

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status:</span>
            {COLUMNS.map((col) => (
              <button
                key={col.status}
                onClick={() => setFilterStatus(filterStatus === col.status ? null : col.status)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                  filterStatus === col.status
                    ? `${col.bg} ${col.color} border-current`
                    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                {col.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowCreateWs(true)}
              className="text-xs text-slate-500 hover:text-violet-700 border border-slate-200 hover:border-violet-300 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              + Workspace
            </button>

            <button
              onClick={() => openAddTask(workspaces[0]?.id ?? null)}
              className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors shadow-sm"
            >
              + New Task
            </button>
          </div>
        </div>

        {/* Completion filter + Progress + overdue */}
        <div className="flex items-center gap-3 px-1 flex-wrap">
          <div className="flex gap-1">
            {(["All", "Pending", "Completed"] as CompletionFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterCompletion(f)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                  filterCompletion === f
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400">{totalDone}/{tasks.length} done</span>
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden min-w-[80px]">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${tasks.length ? (totalDone / tasks.length) * 100 : 0}%` }} />
          </div>

          {overdueCount > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">
              ⚠ {overdueCount} overdue
            </span>
          )}

          {(filterStatus || filterMember || filterCompletion !== "All") && (
            <button
              onClick={() => { setFilterStatus(null); setFilterMember(null); setFilterCompletion("All"); }}
              className="text-xs text-violet-600 hover:underline"
            >
              Clear filters ×
            </button>
          )}
        </div>

        {/* Workspace groups */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map((i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-24 animate-pulse" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🗂</div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No workspaces yet</p>
            <p className="text-xs text-slate-400 mb-4">Your Personal workspace is being set up…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map(({ ws, tasks: wsTasks }) => {
              const collapsed = !!collapsedWs[ws.id];
              const doneCount = wsTasks.filter((t) => t.status === "Done").length;

              return (
                <section
                  key={ws.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Workspace header */}
                  <header
                    className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-white to-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCollapseWs(ws.id)}
                  >
                    <span className={`text-[10px] ${collapsed ? "rotate-[-90deg]" : ""} transition-transform text-slate-400`}>▼</span>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {ws.is_personal && <span title="Personal workspace — locked" className="text-xs">🔒</span>}
                      <h3 className="text-sm font-bold text-slate-800 truncate">{ws.name}</h3>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        {wsTasks.length}
                      </span>
                      {wsTasks.length > 0 && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0 hidden sm:inline">
                          · {doneCount}/{wsTasks.length} done
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openAddTask(ws.id === ORPHAN_WS_ID ? null : ws.id)}
                        className="text-xs text-slate-500 hover:text-violet-700 font-medium px-2.5 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                      >
                        + Add
                      </button>
                      {!ws.is_personal && ws.id !== ORPHAN_WS_ID && (
                        <button
                          onClick={() => handleDeleteWorkspace(ws)}
                          className="text-slate-300 hover:text-red-500 text-xs px-2 py-1 transition-colors"
                          title="Delete workspace"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </header>

                  {/* Workspace body */}
                  {!collapsed && (
                    <div className="divide-y divide-slate-50">
                      {wsTasks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-400">
                          No tasks here yet.
                          <button
                            onClick={() => openAddTask(ws.id === ORPHAN_WS_ID ? null : ws.id)}
                            className="text-violet-600 hover:text-violet-800 font-medium ml-1"
                          >
                            Add one →
                          </button>
                        </div>
                      ) : (
                        COLUMNS.filter((col) => !filterStatus || col.status === filterStatus).map((col) => {
                          const colTasks = wsTasks.filter((t) => t.status === col.status);
                          if (colTasks.length === 0) return null;
                          return (
                            <div key={col.status}>
                              {/* Status sub-header */}
                              <div className={`flex items-center gap-2 px-4 py-2 ${col.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                                <span className="text-[10px] text-slate-400">· {colTasks.length}</span>
                              </div>
                              {/* Tasks in this status */}
                              <div className="divide-y divide-slate-50">
                                {colTasks.map((task) => {
                                  const isDone    = task.status === "Done" || task.completed;
                                  const isOverdue = task.due_date && !isDone && isPast(parseISO(task.due_date));
                                  return (
                                  <div
                                    key={task.id}
                                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors group ${selectedTask?.id === task.id ? "bg-violet-50" : ""}`}
                                  >
                                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 mt-1 ${PRIORITY_STRIP[task.priority] ?? "bg-slate-200"}`} />

                                    {/* Inline complete toggle — ported from PersonalTaskManager */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                        isDone ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-violet-400"
                                      }`}
                                      title={isDone ? "Mark as To Do" : "Mark as Done"}
                                    >
                                      {isDone && (
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium text-slate-700 truncate ${isDone ? "line-through text-slate-400" : ""}`}>
                                        {task.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {task.category && (
                                          <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                                            {task.category}
                                          </span>
                                        )}
                                        {task.due_date && (
                                          <span className={`text-[10px] font-medium ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                                            {isOverdue ? "⚠ " : "📅 "}
                                            {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                          </span>
                                        )}
                                        <span className={`text-[10px] font-medium ${
                                          task.priority === "High" ? "text-red-500" : task.priority === "Medium" ? "text-amber-500" : "text-slate-400"
                                        }`}>
                                          {task.priority}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {task.assignee && <Avatar profile={task.assignee} size="xs" />}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                        className="text-slate-300 hover:text-red-500 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-all text-xs"
                                        title="Delete task"
                                      >
                                        🗑
                                      </button>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Task detail panel ─────────────────────────────────────────────── */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 sm:hidden" onClick={() => setSelectedTask(null)} />
          <div className="fixed inset-x-0 bottom-0 top-16 z-40 sm:static sm:z-auto sm:inset-auto sm:w-80 lg:w-96 sm:flex-shrink-0 sm:h-auto">
            <TaskDetailPanel
              task={selectedTask}
              allProfiles={profiles}
              workspaces={workspaces}
              onClose={() => setSelectedTask(null)}
              onUpdate={handleUpdate}
              onRefresh={fetchAll}
            />
          </div>
        </>
      )}

      {/* ── Add task modal ────────────────────────────────────────────────── */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-md flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">New Task</h2>
              <button onClick={() => { setShowAddTask(false); setAddError(""); }} className="text-slate-300 hover:text-slate-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* Workspace picker */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Workspace</label>
                <select
                  value={addWsId ?? ""}
                  onChange={(e) => setAddWsId(e.target.value || null)}
                  className="w-full text-sm bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  {workspaces.length === 0 && <option value="">No workspace (legacy)</option>}
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.is_personal ? "🔒 " : ""}{ws.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Title *</label>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                  placeholder="What needs to be done?"
                  className="w-full text-sm bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLUMNS.map((col) => (
                    <button key={col.status} onClick={() => setNewStatus(col.status)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1 ${
                        newStatus === col.status ? `${col.bg} ${col.color} border-current` : "border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Priority</label>
                <div className="flex gap-1.5">
                  {["High", "Medium", "Low"].map((p) => {
                    const styles: Record<string, string> = { High: "border-red-300 bg-red-50 text-red-600", Medium: "border-amber-300 bg-amber-50 text-amber-600", Low: "border-slate-200 bg-slate-50 text-slate-500" };
                    return (
                      <button key={p} onClick={() => setNewPriority(p)}
                        className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${newPriority === p ? styles[p] : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group + Due date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Group (optional)</label>
                  <input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                    placeholder="e.g. Sales, Ops…"
                    className="w-full text-xs bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Due Date</label>
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer" />
                </div>
              </div>

              {/* Assignee — M365 org search */}
              <OrgPeoplePicker
                profiles={profiles}
                selected={newAssignee}
                onChange={setNewAssignee}
                label="Assign to"
                placeholder="Search org by name or email…"
              />

              {addError && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{addError}</p>}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => { setShowAddTask(false); setAddError(""); }}
                className="text-sm text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleAddTask} disabled={addSaving || !newTitle.trim()}
                className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-6 py-2 rounded-xl disabled:opacity-50 transition-colors">
                {addSaving ? "Creating…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create workspace modal ────────────────────────────────────────── */}
      {showCreateWs && (
        <CreateWorkspaceModal
          profiles={profiles}
          onClose={() => setShowCreateWs(false)}
          onCreated={handleWorkspaceCreated}
        />
      )}

      {/* ── Notify modal ──────────────────────────────────────────────────── */}
      {pendingNotify && (() => {
        const taskObj = tasks.find((t) => t.id === pendingNotify.taskId);
        if (!taskObj) return null;
        return (
          <NotifyModal
            assignee={pendingNotify.assignee}
            task={taskObj}
            onConfirm={(ch) => handleSendNotify(ch as unknown as Record<string, boolean>)}
            onClose={() => setPendingNotify(null)}
          />
        );
      })()}
    </div>
  );
}
