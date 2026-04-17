"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Workspace, WorkspaceMember, Profile } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { OrgPeoplePicker, OrgPerson } from "@/components/ui/OrgPeoplePicker";

interface Props {
  onClose: () => void;
}

interface WorkspaceWithMeta extends Workspace {
  members?:      WorkspaceMember[];
  myRole?:       "admin" | "member";
  amICreator?:   boolean;
}

export function ManageWorkspacesModal({ onClose }: Props) {
  const { data: session } = useSession();
  const supabase = createClient();
  const myId = session?.user?.id;

  const [workspaces, setWorkspaces] = useState<WorkspaceWithMeta[]>([]);
  const [profiles,   setProfiles]   = useState<Profile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renaming,   setRenaming]   = useState<string | null>(null);
  const [newName,    setNewName]    = useState("");
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const [toast,      setToast]      = useState("");
  const [busy,       setBusy]       = useState(false);

  // ─── Fetch all workspaces + their members for the current user ───────────
  const refreshAll = useCallback(async () => {
    setLoading(true);

    // Profiles (for OrgPeoplePicker quick-select) — direct supabase read
    const { data: p } = await supabase.from("profiles").select("*");
    if (Array.isArray(p)) setProfiles(p as Profile[]);

    const wsRes = await fetch("/api/workspace");
    if (!wsRes.ok) { setLoading(false); return; }
    const ws: Workspace[] = await wsRes.json();

    const hydrated = await Promise.all(
      ws.map(async (w) => {
        const mRes = await fetch(`/api/workspace/${w.id}/members`);
        const members: WorkspaceMember[] = mRes.ok ? await mRes.json() : [];
        const mine = members.find((m) => m.user_id === myId);
        return {
          ...w,
          members,
          myRole:     mine?.role,
          amICreator: w.created_by === myId,
        } as WorkspaceWithMeta;
      })
    );

    setWorkspaces(hydrated);
    setLoading(false);
  }, [myId]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // ─── Rename ──────────────────────────────────────────────────────────────
  const startRename = (ws: WorkspaceWithMeta) => {
    setRenaming(ws.id);
    setNewName(ws.name);
  };

  const handleRename = async (ws: WorkspaceWithMeta) => {
    if (!newName.trim() || newName.trim() === ws.name) {
      setRenaming(null);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/workspace/${ws.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: newName.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setRenaming(null);
      showToast("Renamed ✓");
      refreshAll();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Rename failed");
    }
  };

  // ─── Delete whole workspace ──────────────────────────────────────────────
  const handleDelete = async (ws: WorkspaceWithMeta) => {
    if (!confirm(`Delete workspace "${ws.name}" and ALL its tasks? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/workspace/${ws.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      showToast("Deleted ✓");
      refreshAll();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Delete failed");
    }
  };

  // ─── Leave ───────────────────────────────────────────────────────────────
  const handleLeave = async (ws: WorkspaceWithMeta) => {
    if (!myId) return;
    if (!confirm(`Leave "${ws.name}"? You'll lose access to its tasks.`)) return;
    setBusy(true);
    const res = await fetch(`/api/workspace/${ws.id}/members?userId=${myId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      showToast("Left ✓");
      refreshAll();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Leave failed");
    }
  };

  // ─── Remove member ───────────────────────────────────────────────────────
  const handleRemoveMember = async (ws: WorkspaceWithMeta, member: WorkspaceMember) => {
    if (!confirm(`Remove ${member.display_name || member.email}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/workspace/${ws.id}/members?userId=${member.user_id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      showToast("Member removed ✓");
      refreshAll();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Remove failed");
    }
  };

  // ─── Add member ──────────────────────────────────────────────────────────
  const handleAddMember = async (ws: WorkspaceWithMeta, person: OrgPerson | null) => {
    if (!person) return;
    setBusy(true);
    const res = await fetch(`/api/workspace/${ws.id}/members`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email:        person.email,
        display_name: person.name,
        role:         "member",
      }),
    });
    setBusy(false);
    if (res.ok) {
      showToast("Added ✓");
      setPickerOpen(null);
      refreshAll();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Add failed");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Manage Workspaces</h2>
            <p className="text-[11px] text-slate-400">Rename, invite, remove, or leave a workspace.</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
          {loading ? (
            <>
              {[1,2,3].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              You don&apos;t have any workspaces yet.
            </div>
          ) : (
            workspaces.map((ws) => {
              const canAdmin  = !ws.is_personal && (ws.amICreator || ws.myRole === "admin");
              const canDelete = !ws.is_personal && ws.amICreator;
              const canLeave  = !ws.is_personal && !ws.amICreator;
              const isExpanded = expandedId === ws.id;

              return (
                <section key={ws.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Row header */}
                  <header className="px-4 py-3 flex items-center gap-2 bg-white hover:bg-slate-50 transition-colors">
                    {ws.is_personal && <span title="Personal — locked" className="text-sm">🔒</span>}

                    {renaming === ws.id ? (
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(ws);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        onBlur={() => handleRename(ws)}
                        className="flex-1 text-sm font-semibold text-slate-800 bg-slate-50 rounded-lg px-2 py-1 border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    ) : (
                      <h3
                        className={`flex-1 text-sm font-semibold text-slate-800 truncate ${canAdmin ? "cursor-pointer hover:text-violet-700" : ""}`}
                        onClick={() => canAdmin && startRename(ws)}
                        title={canAdmin ? "Click to rename" : ws.name}
                      >
                        {ws.name}
                      </h3>
                    )}

                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {ws.members?.length ?? 0} {ws.members?.length === 1 ? "member" : "members"}
                    </span>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ws.id)}
                      className="text-xs text-slate-400 hover:text-violet-600 font-medium flex-shrink-0"
                    >
                      {isExpanded ? "Hide" : "Manage"}
                    </button>
                  </header>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex flex-col gap-3">

                      {/* Members list */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                          Members
                        </p>
                        {(ws.members ?? []).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No members yet.</p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {ws.members!.map((m) => {
                              const isMe        = m.user_id === myId;
                              const canRemoveMe = canAdmin && !isMe;
                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-100"
                                >
                                  <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                    {(m.display_name ?? m.email).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate">
                                      {m.display_name ?? m.email}
                                      {isMe && <span className="text-slate-400 font-normal ml-1">(you)</span>}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                                  </div>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                    m.role === "admin"
                                      ? "bg-violet-100 text-violet-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {m.role}
                                  </span>
                                  {m.pending && (
                                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-1.5 py-0.5 flex-shrink-0">
                                      pending
                                    </span>
                                  )}
                                  {canRemoveMe && (
                                    <button
                                      onClick={() => handleRemoveMember(ws, m)}
                                      className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0"
                                      title="Remove"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Invite */}
                      {canAdmin && (
                        <div>
                          {pickerOpen === ws.id ? (
                            <div className="flex flex-col gap-2">
                              <OrgPeoplePicker
                                profiles={profiles}
                                selected={null}
                                onChange={(p) => handleAddMember(ws, p)}
                                label="Invite someone"
                                placeholder="Search org by name or email…"
                              />
                              <button
                                onClick={() => setPickerOpen(null)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 self-start"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPickerOpen(ws.id)}
                              className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                            >
                              + Invite member
                            </button>
                          )}
                        </div>
                      )}

                      {/* Row actions */}
                      <div className="flex gap-2 pt-1 border-t border-slate-200">
                        {canLeave && (
                          <button
                            disabled={busy}
                            onClick={() => handleLeave(ws)}
                            className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            ⎋ Leave workspace
                          </button>
                        )}
                        {canDelete && (
                          <button
                            disabled={busy}
                            onClick={() => handleDelete(ws)}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ml-auto"
                          >
                            🗑 Delete workspace
                          </button>
                        )}
                        {ws.is_personal && (
                          <span className="text-[11px] text-slate-400 italic px-1 py-1.5">
                            Your Personal workspace is locked — it can&apos;t be renamed, shared, or deleted.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-10">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
