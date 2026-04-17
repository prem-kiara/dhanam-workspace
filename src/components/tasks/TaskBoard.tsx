"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Task, Profile, TaskCategory, TaskSubcategory,
  TaskSubsubcategory, UpdateTaskPayload, NotifyChannels, SendNotificationPayload,
  Workspace,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import { TaskCard } from "./TaskCard";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { NotifyModal } from "./NotifyModal";
import { AddSubCategoryModal } from "./AddSubCategoryModal";
import { AddTaskModal } from "./AddTaskModal";
import { StatusBadge } from "@/components/ui/Badge";

interface AddSubSubFor { category: TaskCategory; subcategory: TaskSubcategory; }
interface PendingNotify { assignee: Profile; taskId: string; taskTitle: string; action: "assign" | "reassign"; }
interface AddTaskFor { categoryId?: string; subcategoryId?: string; }

export function TaskBoard() {
  const { data: session } = useSession();
  const supabase = createClient();

  // Workspace state
  const [workspaces,    setWorkspaces]    = useState<Workspace[]>([]);
  const [activeWsId,    setActiveWsId]    = useState<string | null>(null);
  const [wsDropdown,    setWsDropdown]    = useState(false);
  const [newWsName,     setNewWsName]     = useState("");
  const [creatingWs,    setCreatingWs]    = useState(false);

  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [profiles,    setProfiles]    = useState<Profile[]>([]);
  const [categories,  setCategories]  = useState<TaskCategory[]>([]);
  const [subcats,     setSubcats]     = useState<TaskSubcategory[]>([]);
  const [subsubcats,  setSubsubcats]  = useState<TaskSubsubcategory[]>([]);
  const [loading,     setLoading]     = useState(true);

  const [selectedTask,  setSelectedTask]  = useState<Task | null>(null);
  const [collapsedCat,  setCollapsedCat]  = useState<Record<string, boolean>>({});
  const [collapsedSub,  setCollapsedSub]  = useState<Record<string, boolean>>({});
  const [addSubSubFor,  setAddSubSubFor]  = useState<AddSubSubFor | null>(null);
  const [pendingNotify, setPendingNotify] = useState<PendingNotify | null>(null);
  const [filterMember,  setFilterMember]  = useState<string | null>(null);
  const [addTaskFor,    setAddTaskFor]    = useState<AddTaskFor | null>(null);

  // Fetch workspaces on mount
  useEffect(() => {
    if (!session) return;
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((ws: Workspace[]) => {
        if (Array.isArray(ws)) setWorkspaces(ws);
      });
  }, [session]);

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    const res = await fetch("/api/workspace", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: newWsName.trim() }),
    });
    if (res.ok) {
      const ws: Workspace = await res.json();
      setWorkspaces((prev) => [...prev, ws]);
      setActiveWsId(ws.id);
      setNewWsName("");
    }
    setCreatingWs(false);
    setWsDropdown(false);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: cats },
      { data: subs },
      { data: subsubs },
      { data: profs },
      { data: tsks },
    ] = await Promise.all([
      supabase.from("task_categories").select("*").order("sort_order"),
      supabase.from("task_subcategories").select("*").order("sort_order"),
      supabase.from("task_subsubcategories").select("*").order("sort_order"),
      supabase.from("profiles").select("*"),
      supabase.from("tasks").select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, name, initials, color, avatar_url, email, phone, created_at),
        category:task_categories(id, name, sort_order, created_at),
        subcategory:task_subcategories(id, category_id, name, sort_order, created_at),
        subsubcategory:task_subsubcategories(id, subcategory_id, name, sort_order, created_at),
        comments:task_comments(id, task_id, author_id, content, created_at, author:profiles(id, name, initials, color, avatar_url, email, phone, created_at))
      `).order("created_at", { ascending: false }),
    ]);

    if (cats)    setCategories(cats);
    if (subs)    setSubcats(subs);
    if (subsubs) setSubsubcats(subsubs);
    if (profs)   setProfiles(profs as Profile[]);
    if (tsks) {
      const withCount = (tsks as Task[]).map((t) => ({
        ...t,
        _comment_count: (t.comments ?? []).length,
      }));
      setTasks(withCount);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (session) fetchAll(); }, [session, fetchAll]);

  // Real-time task updates
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("tasks_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_comments" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const handleUpdate = async (id: string, payload: UpdateTaskPayload, newAssignee?: Profile) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { assignee_id, ...rest } = payload;
    await supabase.from("tasks").update({ ...rest, ...(assignee_id ? { assignee_id } : {}) }).eq("id", id);

    setTasks((prev) => prev.map((t) => t.id === id ? {
      ...t, ...rest,
      ...(assignee_id ? { assignee_id, assignee: newAssignee ?? t.assignee } : {}),
    } : t));
    setSelectedTask((prev) => prev?.id === id ? {
      ...prev, ...rest,
      ...(assignee_id ? { assignee_id, assignee: newAssignee ?? prev.assignee } : {}),
    } : prev);

    if (newAssignee && assignee_id && assignee_id !== task.assignee_id) {
      setPendingNotify({
        assignee:  newAssignee,
        taskId:    id,
        taskTitle: task.title,
        action:    "reassign",
      });
    }
  };

  const handleAddSubSubcat = async (name: string) => {
    if (!addSubSubFor) return;
    const { data } = await supabase
      .from("task_subsubcategories")
      .insert({ subcategory_id: addSubSubFor.subcategory.id, name })
      .select()
      .single();
    if (data) setSubsubcats((prev) => [...prev, data as TaskSubsubcategory]);
    setAddSubSubFor(null);
  };

  const handleSendNotify = async (channels: NotifyChannels) => {
    if (!pendingNotify) return;
    const payload: SendNotificationPayload = {
      assignee_id: pendingNotify.assignee.id,
      task_id:     pendingNotify.taskId,
      task_title:  pendingNotify.taskTitle,
      channels,
      action:      pendingNotify.action,
    };
    await fetch("/api/send-notification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setPendingNotify(null);
  };

  // ─── Board grouping ───────────────────────────────────────────────────────
  const filteredTasks = filterMember
    ? tasks.filter((t) => t.assignee_id === filterMember)
    : tasks;

  const totalDone = tasks.filter((t) => t.status === "Done").length;

  return (
    <div className="flex gap-4 lg:gap-6 h-full relative overflow-hidden">
      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col gap-3 overflow-y-auto pr-1 min-w-0 transition-all ${selectedTask ? "hidden sm:flex" : "flex"}`}>
        {/* Workspace selector */}
        {workspaces.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setWsDropdown(!wsDropdown)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-violet-300 transition-colors"
            >
              <span className="w-2 h-2 bg-violet-500 rounded-full" />
              {activeWsId ? workspaces.find((w) => w.id === activeWsId)?.name ?? "Select workspace" : "All workspaces"}
              <span className="text-slate-400">▾</span>
            </button>
            {wsDropdown && (
              <div className="absolute left-0 top-10 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20 min-w-[180px]">
                <button
                  onClick={() => { setActiveWsId(null); setWsDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  All workspaces
                </button>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWsId(ws.id); setWsDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${activeWsId === ws.id ? "text-violet-700 font-semibold" : "text-slate-600"}`}
                  >
                    {ws.name}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1 px-3 pb-2">
                  <div className="flex gap-1.5 mt-1">
                    <input
                      type="text"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      placeholder="New workspace…"
                      className="flex-1 text-xs bg-slate-50 rounded-lg px-2 py-1 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    />
                    <button
                      onClick={handleCreateWorkspace}
                      disabled={creatingWs || !newWsName.trim()}
                      className="text-xs bg-violet-600 text-white px-2 py-1 rounded-lg disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm sticky top-0 z-10">
          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
            <button
              onClick={() => setFilterMember(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${!filterMember ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}
            >All</button>
            {profiles.map((p) => (
              <button
                key={p.id}
                title={p.name}
                onClick={() => setFilterMember(filterMember === p.id ? null : p.id)}
                className={`w-7 h-7 ${p.color} rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all ${filterMember === p.id ? "ring-2 ring-offset-1 ring-violet-600" : "opacity-60 hover:opacity-100"}`}
              >
                {p.initials}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200" />
          <div className="hidden sm:flex gap-1.5 flex-wrap">
            {(["To Do", "In Progress", "In Review", "Done"] as const).map((s) => <StatusBadge key={s} status={s} />)}
          </div>

          <button
            onClick={() => setAddTaskFor({})}
            className="ml-auto text-xs bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 font-medium transition-colors"
          >
            + New Task
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-slate-400">{totalDone}/{tasks.length} done</span>
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${tasks.length ? (totalDone / tasks.length) * 100 : 0}%` }} />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-32 animate-pulse" />)}
          </div>
        ) : (
          categories.map((cat) => {
            const catTasks = filteredTasks.filter((t) => t.category_id === cat.id);
            const catSubs  = subcats.filter((s) => s.category_id === cat.id);
            const isCatCollapsed = collapsedCat[cat.id];

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => setCollapsedCat((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{catTasks.length}</span>
                    <div className="flex gap-1">
                      {catTasks.slice(0, 8).map((t) => {
                        const dots: Record<string, string> = { "To Do": "bg-slate-400", "In Progress": "bg-blue-500", "In Review": "bg-amber-500", Done: "bg-emerald-500" };
                        return <span key={t.id} className={`w-2 h-2 rounded-full ${dots[t.status]}`} title={t.status} />;
                      })}
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm">{isCatCollapsed ? "▸" : "▾"}</span>
                </button>

                {!isCatCollapsed && (
                  <div className="border-t border-slate-100">
                    {catSubs.map((sub) => {
                      const subKey   = `${cat.id}::${sub.id}`;
                      const subTasks = catTasks.filter((t) => t.subcategory_id === sub.id);
                      const subSubs  = subsubcats.filter((ss) => ss.subcategory_id === sub.id);
                      const noSST    = subTasks.filter((t) => !t.subsubcategory_id);
                      const isSubCollapsed = collapsedSub[subKey];

                      return (
                        <div key={sub.id} className="border-b border-slate-100 last:border-0">
                          {/* Sub header */}
                          <button
                            onClick={() => setCollapsedSub((p) => ({ ...p, [subKey]: !p[subKey] }))}
                            className="w-full px-5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{sub.name}</span>
                              <span className="text-xs text-slate-400">({subTasks.length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddSubSubFor({ category: cat, subcategory: sub }); }}
                                className="text-xs text-violet-500 hover:text-violet-700 px-2 py-0.5 rounded-md hover:bg-violet-50 font-medium"
                              >
                                + Sub-group
                              </button>
                              <span className="text-slate-400 text-xs">{isSubCollapsed ? "▸" : "▾"}</span>
                            </div>
                          </button>

                          {!isSubCollapsed && (
                            <div className="p-3">
                              {noSST.length > 0 && (
                                <div className="flex flex-col gap-2 mb-2">
                                  {noSST.map((task) => (
                                    <TaskCard
                                      key={task.id}
                                      task={task}
                                      isSelected={selectedTask?.id === task.id}
                                      onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                                    />
                                  ))}
                                </div>
                              )}

                              {subSubs.map((ss) => {
                                const ssKey   = `${subKey}::${ss.id}`;
                                const ssTasks = subTasks.filter((t) => t.subsubcategory_id === ss.id);
                                const isSSCollapsed = collapsedSub[ssKey];
                                return (
                                  <div key={ss.id} className="ml-3 border-l-2 border-violet-100 pl-3 mb-2">
                                    <button
                                      onClick={() => setCollapsedSub((p) => ({ ...p, [ssKey]: !p[ssKey] }))}
                                      className="w-full flex items-center justify-between py-1.5 mb-1.5"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-violet-500">↳ {ss.name}</span>
                                        <span className="text-xs text-slate-400">({ssTasks.length})</span>
                                      </div>
                                      <span className="text-slate-400 text-xs">{isSSCollapsed ? "▸" : "▾"}</span>
                                    </button>
                                    {!isSSCollapsed && (
                                      <div className="flex flex-col gap-2">
                                        {ssTasks.map((task) => (
                                          <TaskCard
                                            key={task.id}
                                            task={task}
                                            isSelected={selectedTask?.id === task.id}
                                            onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              <button
                                onClick={() => setAddTaskFor({ categoryId: cat.id, subcategoryId: sub.id })}
                                className="text-xs text-slate-400 hover:text-violet-600 text-left px-1 py-1 hover:bg-violet-50 rounded-lg transition-colors w-full mt-1"
                              >
                                + Add task in {sub.name}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Task detail panel (side on desktop, overlay on mobile) ────────── */}
      {selectedTask && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 z-30 sm:hidden"
            onClick={() => setSelectedTask(null)}
          />
          <div className="fixed inset-x-4 bottom-4 top-20 z-40 sm:static sm:z-auto sm:inset-auto sm:w-80 sm:flex-shrink-0">
            <TaskDetailPanel
              task={selectedTask}
              allProfiles={profiles}
              onClose={() => setSelectedTask(null)}
              onUpdate={handleUpdate}
            />
          </div>
        </>
      )}

      {/* ── Add sub-subcategory modal ──────────────────────────────────────── */}
      {addSubSubFor && (
        <AddSubCategoryModal
          parentLabel={`${addSubSubFor.category.name} / ${addSubSubFor.subcategory.name}`}
          onAdd={handleAddSubSubcat}
          onClose={() => setAddSubSubFor(null)}
        />
      )}

      {/* ── Add task modal ────────────────────────────────────────────────── */}
      {addTaskFor !== null && (
        <AddTaskModal
          categories={categories}
          subcategories={subcats}
          profiles={profiles}
          defaultCategoryId={addTaskFor.categoryId}
          defaultSubcategoryId={addTaskFor.subcategoryId}
          onClose={() => setAddTaskFor(null)}
          onCreated={fetchAll}
        />
      )}

      {/* ── Notify modal ─────────────────────────────────────────────────── */}
      {pendingNotify && (() => {
        const taskObj = tasks.find((t) => t.id === pendingNotify.taskId);
        if (!taskObj) return null;
        return (
          <NotifyModal
            assignee={pendingNotify.assignee}
            task={taskObj}
            onConfirm={(channels) => handleSendNotify(channels as any)}
            onClose={() => setPendingNotify(null)}
          />
        );
      })()}
    </div>
  );
}
