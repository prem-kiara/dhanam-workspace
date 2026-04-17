"use client";

import { useState } from "react";
import { Workspace, Profile } from "@/types";
import { OrgPeoplePicker, OrgPerson } from "@/components/ui/OrgPeoplePicker";

interface Props {
  profiles?: Profile[];
  onClose:   () => void;
  onCreated: (ws: Workspace) => void;
}

export function CreateWorkspaceModal({ profiles = [], onClose, onCreated }: Props) {
  const [name,     setName]     = useState("");
  const [members,  setMembers]  = useState<OrgPerson[]>([]);
  const [picker,   setPicker]   = useState<OrgPerson | null>(null);
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState("");

  const addMember = (person: OrgPerson | null) => {
    if (!person) return;
    setPicker(null);
    if (members.some((m) => m.email.toLowerCase() === person.email.toLowerCase())) return;
    setMembers((prev) => [...prev, person]);
  };

  const removeMember = (email: string) => {
    setMembers((prev) => prev.filter((m) => m.email !== email));
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Workspace name is required."); return; }
    setCreating(true); setError("");

    const wsRes = await fetch("/api/workspace", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim() }),
    });
    if (!wsRes.ok) {
      const d = await wsRes.json().catch(() => ({}));
      setError(d.error ?? "Failed to create workspace.");
      setCreating(false);
      return;
    }
    const ws: Workspace = await wsRes.json();

    // Add each invitee as a member (pending if not yet signed in)
    await Promise.all(
      members.map((m) =>
        fetch(`/api/workspace/${ws.id}/members`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            email:        m.email,
            display_name: m.name,
            role:         "member",
          }),
        }).catch(() => {})
      )
    );

    setCreating(false);
    onCreated(ws);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-md flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800">New Workspace</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 text-xl">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleCreate(); }}
              placeholder="e.g. Sales Q2, Onboarding, Ops…"
              className="w-full text-sm bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {/* Members */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Invite members (optional)
            </label>

            {/* Selected pills */}
            {members.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {members.map((m) => (
                  <span
                    key={m.email}
                    className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full pl-1 pr-2 py-0.5"
                  >
                    <span className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      {(m.initials ?? m.name.split(" ").map((p) => p[0]).join("")).slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-xs text-violet-700 font-medium truncate max-w-[120px]">{m.name}</span>
                    <button
                      onClick={() => removeMember(m.email)}
                      className="text-violet-400 hover:text-violet-700 text-xs font-bold ml-0.5"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Picker (single at a time — on select, moves to pills) */}
            <OrgPeoplePicker
              profiles={profiles}
              selected={picker}
              onChange={addMember}
              label=""
              placeholder="Search people to invite…"
            />

            <p className="text-[11px] text-slate-400 mt-1.5">
              You can add more people later from the workspace menu. Invited people who haven't signed in yet will be marked as pending.
            </p>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="text-sm text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-6 py-2 rounded-xl disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating…" : "Create Workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
